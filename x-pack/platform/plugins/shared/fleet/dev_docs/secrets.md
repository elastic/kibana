### Secrets

Fleet users often need to provide sensitive information as part of their output and integration config, for example API keys or credentials. Originally these were value were not treated in any special way, but the requirement cae to store these more securely.

## Solution Design

When it came to designing secrets storage, our goals were:

- 1. Kibana System and Fleet users should not be able to read any secrets once they are written for the first time
- 2. A malicious actor who gains authorization access to Kibana or Elasticsearch, or exploits an RCE in Kibana should not be able to read plaintext secret values.
- 3. Secrets in integration policies and outputs should be able to utilize secrets
- 4. When upgrading an integration policy, the policies secrets should be mapped across to the new version without user intervention
- 5. The design will use elastic as the secret store, however it should not prevent new secret stores from being added in the future.


## Architecture

![secret storage architecture](./diagrams/secrets/secret_storage_architecture.png)

Here is an overview of the integration policy flow:
- 1. A package identifies a field as secret using a new package spec
- 2. On creating an integration policy with a secret field, the secret is sent from the UI in plaintext
- 3. Kibana extracts secrets from the package policy using the package manifest to know which fields are secret
- 4. Kibana stores the secrets in the new `.secrets` system index 
- 5. Kibana stores the policy with references to the secrets instead of the secrets
- 6. Fleet server reads the policy and retrieves the secrets
- 7. The fleet server inserts the secrets into the policy and passes the policy to the agent

### What is a secret reference? 
A secret reference replaces a plain text value, and refers to a record in the .fleet-secrets system index (or other secret store in the future). In the .fleet-secrets system index we only store the value itself.

_example document from the .fleet-secrets index_
```jsonc
{
	"_id": "abcd1234",
	"_source": {
        "value": "abcd12345678",
    }
}
```

Kibana system user only has write and delete privileges for the .fleet-secrets system index. Fleet server user has read access.

The secret reference is then stored in the package policy in a format to let us know it is a secret reference:

_ingest-package-policies saved object in inputs.0.vars for example.._
```jsonc
"password": {
    "type": "password",
    "value": { 
        "isSecretRef": true
        "id": "12345678"
    }
}
```

We then track all secrets contained in a policy at the top level of the package policy saved object, this removes the need for us to ever recurse over a policy to find all the secrets it uses:
_ingest-package-policies saved object at the top level_
```jsonc
 secret_refs: [{
    id: "abcd1234",
    // in the future we may also have
    // encrypted: true
    // source: "elastic"
 }]
```

We then need to have the secret ID in the compiled package policy for the fleet server to replace with the value. For this we have a known scheme to refer to a secret reference. We use “$co.elastic.secret\{\<secret id\>\}” scheme. For example the above secret would then be stored in the compiled package policy as follows:

```jsonc
{
"password": "$co.elastic.secret{abcd1234}",
// or in the case of a secret nested within a field...
"header": "Authorization Basic: $co.elastic.secret{abcd1234}",
}
```

### How does Fleet Server replace the secret references with the secrets? 
Fleet server has read access to the .fleet-secrets index. Upon receiving a new policy update, Fleet Server first retrieves the secrets referenced in the policy, to accommodate this we have a block at the top of the agent policy that lists all secrets used within the policy:
```jsonc
{
 //at the top level of the policy sent to fleet server
 secret_refs: [{
    id: "abcd12345",
    // this is an object so that we can add attributes to the secret in the future, e.g a source or if it is encrypted
 },
 {
    // this may be an integration secret or an output secret
    id: "defg56789"
 }]
}
```

Having gathered the secrets, fleet server then performs templating on the policy replacing the integration or output secret references with the secret value.

### How is Fleet server backwards compatibility handled?

Integration secrets are only supported by Fleet server 8.10.0 or greater, output secrets 8.12.0. 

For integration secrets, when performing CRUD on a package policy, we first check the global settings saved object to see if secrets are enabled, if so then secret storage is used.

If secret storage is not enabled, we check all fleet server versions, if they meet the minimum spec, then we enable secret storage on the global settings saved object and the check is never performed again. 

For output secrets, we do not perform this check as outputs offer a plain text alternative for all secret fields. Instead we warn the user about the version requirements and let them decide. 

### Using Fleet secrets from other plugins

Other plugins call `FleetStartContract.getSecretsService({ request, consumer })`. Fleet supplies its internal Elasticsearch and saved objects clients. Every audit entry the service writes records `consumer` (`labels.consumer`) and, when `request` is given, the user. Omit `request` only for background work such as tasks.

- `createSecrets(values)` creates one secret per value and returns `{ id }` in input order.
  - Requests are not retried: retrying a lost response would create a duplicate secret.
  - All or nothing: on any failure, it deletes the secrets this call created and throws.
  - A failed request Elasticsearch did not reject with a 4xx is audited as `secret possibly created` with the `unknown` outcome.
- `deleteSecrets(ids)` returns `{ id, deleted }` per id.
  - Callers may only pass ids returned by their own `createSecrets`. `.fleet-secrets` is shared, and secrets have no owner.
  - The whole call throws before any request is sent when an id is malformed (anything but the 20-character ids Elasticsearch generates) or still referenced by the current revision of a package policy in any space.
  - Nothing else is checked: outputs, Fleet Server hosts, download sources, SSL settings, cloud connectors, previous package policy revisions, compiled agent policies (`.fleet-policies`) and agent actions. Deleting a secret an agent policy still references crashes Fleet Server for the whole deployment (elastic/fleet-server#7536). Delete a secret an action references only once the action can no longer be delivered (it expired or every target agent acknowledged it).
  - An unknown id is reported as `deleted: false`.
  - A 404 after a retried request (retried by Fleet or by the Elasticsearch client) counts as `deleted: true`, because an earlier attempt may have deleted the secret. It is audited as `secret possibly deleted` with the `unknown` outcome, as is any other failure unless Elasticsearch rejected the only attempt with a 4xx response.
- `isSecretStorageEnabledForFeature(feature)` runs the Fleet Server version check described above for a `SecretStorageFeature`. Fleet owns each feature's settings key and minimum version.

To add a feature:

1. Add its id to `SecretStorageFeature` and an entry to `SECRET_STORAGE_FEATURES` (`server/services/secrets/secrets_service.ts`).
2. Add a minimum version constant to `common/constants/secrets.ts`.
3. Add a new settings key to `FleetServerRequirementSettingsKey`, `BaseSettings`, `mapSettingsSO` and the settings saved object (mappings plus a new model version).

The settings latch is sticky, so raising a feature's minimum version needs a new settings key.
