# Declarative connector delivery PoC

This directory is a self-contained local version of the proposed connector
catalog. It serves two development-only connector types:

- `.declarative-abuseipdb`
- `.declarative-okta`

Their forms, action schemas, HTTP requests, retries, and pagination come from
the YAML files under `connectors/`. No connector-specific TypeScript handler is
used.

## What the PoC proves

- Kibana loads connector definitions from an HTTP catalog.
- Catalog entries are validated and verified with SHA-256 hashes.
- The existing generated connector UI consumes the loaded schemas.
- Versioned SVG icons are published beside each definition, integrity checked,
  cached with the last-known-good catalog, and shown by the generated UI.
- Actions execute through one generic HTTP runtime.
- Connector saved objects pin the catalog specification version.
- The complete last-known-good catalog is stored in the dedicated
  `.workflows-connectors` index.
- A bad catalog or unavailable catalog server does not replace that copy.
- Okta Link-header pagination is bounded and cross-origin next links are
  rejected.
- Existing Actions allowed-host, proxy, TLS, response-size, licensing,
  authorization, and encrypted-secret controls remain in the path.

The PoC pre-registers two development connector IDs during Kibana setup. Adding
brand-new connector IDs without a restart requires the generic Task Manager
runner and catalog-backed type resolver described in the RFC. That work is MVP
scope.

## Prerequisites

From the Kibana repository:

```sh
nvm use 24.19.0
yarn kbn bootstrap
```

The bootstrap step is only needed when the checkout has not already been
bootstrapped.

All commands below assume the repository root as the working directory.

## 1. Start the local CDN-like catalog

```sh
node x-pack/platform/plugins/shared/stack_connectors/dev/declarative_connector_catalog/serve_catalog.mjs
```

The catalog is available at:

```text
http://127.0.0.1:8089/catalog.json
```

Check it with:

```sh
curl http://127.0.0.1:8089/catalog.json
curl -I http://127.0.0.1:8089/connectors/okta/1.0.0.svg
curl -I http://127.0.0.1:8089/connectors/abuseipdb/1.0.0.svg
```

The server sets content types, ETags, and `Cache-Control: no-cache`. Set a
different port with `PORT=9000` and update the Kibana config if needed.

## 2. Start the local vendor API mocks

This lets the full PoC run without AbuseIPDB or Okta credentials:

```sh
node x-pack/platform/plugins/shared/stack_connectors/dev/declarative_connector_catalog/serve_mock_apis.mjs
```

The mock APIs listen on `http://127.0.0.1:8090`. They require any non-empty API
key so the encrypted secret and auth header paths are still exercised.

## 3. Start Elasticsearch with a trial license

The Okta connector metadata requires an enterprise license. A local trial
license covers both PoC connectors.

```sh
yarn es snapshot --license trial
```

## 4. Start Kibana

In another terminal:

```sh
yarn start \
  --no-base-path \
  --config x-pack/platform/plugins/shared/stack_connectors/dev/declarative_connector_catalog/kibana.declarative_connectors.yml
```

The supplied config:

- Enables spec-generated connector forms.
- Enables the declarative catalog.
- Points Kibana at `http://127.0.0.1:8089`.
- Refreshes the catalog every 10 seconds.
- Allows calls to the local mock host.
- Sets a development-only Encrypted Saved Objects key.

Do not reuse that encryption key outside this local PoC.

If the Elasticsearch data directory already contains saved objects encrypted
with another key, Kibana will log unrelated decryption warnings. Use the key
that created that local data, or use a fresh local Elasticsearch data directory.
Keep the same key when restarting Kibana for the last-known-good test.

## 5. Check catalog health

After Kibana starts:

```sh
curl -u elastic:changeme \
  -H 'x-elastic-internal-origin: Kibana' \
  http://127.0.0.1:5601/internal/stack_connectors/declarative_catalog/_health
```

Expected fields include:

```json
{
  "ready": true,
  "activeCatalogVersion": "2026-08-23.1",
  "connectorVersions": {
    ".declarative-abuseipdb": "1.0.0",
    ".declarative-okta": "1.0.0"
  },
  "cachedSpecificationCount": 2
}
```

Use the credentials printed by the local Elasticsearch process if they differ
from `elastic:changeme`.

## 6. Create and test connectors in the UI

1. Open Kibana at `http://127.0.0.1:5601`.
2. Go to **Stack Management > Connectors**.
3. Select **Create connector**.
4. Search for `Declarative PoC`.
5. Create **AbuseIPDB (Declarative PoC)**.
6. Keep `http://127.0.0.1:8090` as the Base URL.
7. Enter any API key, for example `local-poc-key`.
8. Save and run **Test connector**.
9. Repeat for **Okta (Declarative PoC)** with any SSWS token, for example
   `local-poc-token`.

The Okta runtime turns the raw secret into
`Authorization: SSWS local-poc-token`. The prefix is defined by YAML.

## 7. Create connectors with the API

AbuseIPDB:

```sh
curl -u elastic:changeme \
  -H 'Content-Type: application/json' \
  -H 'kbn-xsrf: poc' \
  -X POST http://127.0.0.1:5601/api/actions/connector \
  -d '{
    "name": "Declarative AbuseIPDB local",
    "connector_type_id": ".declarative-abuseipdb",
    "config": {
      "baseUrl": "http://127.0.0.1:8090"
    },
    "secrets": {
      "authType": "api_key_header",
      "Key": "local-poc-key"
    }
  }'
```

Okta:

```sh
curl -u elastic:changeme \
  -H 'Content-Type: application/json' \
  -H 'kbn-xsrf: poc' \
  -X POST http://127.0.0.1:5601/api/actions/connector \
  -d '{
    "name": "Declarative Okta local",
    "connector_type_id": ".declarative-okta",
    "config": {
      "orgUrl": "http://127.0.0.1:8090"
    },
    "secrets": {
      "authType": "api_key_header",
      "Authorization": "local-poc-token"
    }
  }'
```

Save the `id` values returned by these requests.

## 8. Execute actions directly

Replace `ABUSEIPDB_CONNECTOR_ID` with the saved connector ID:

```sh
curl -u elastic:changeme \
  -H 'Content-Type: application/json' \
  -H 'kbn-xsrf: poc' \
  -X POST \
  http://127.0.0.1:5601/api/actions/connector/ABUSEIPDB_CONNECTOR_ID/_execute \
  -d '{
    "params": {
      "subAction": "checkIp",
      "subActionParams": {
        "ipAddress": "192.0.2.10",
        "maxAgeInDays": 90
      }
    }
  }'
```

Replace `OKTA_CONNECTOR_ID` with the saved Okta connector ID:

```sh
curl -u elastic:changeme \
  -H 'Content-Type: application/json' \
  -H 'kbn-xsrf: poc' \
  -X POST \
  http://127.0.0.1:5601/api/actions/connector/OKTA_CONNECTOR_ID/_execute \
  -d '{
    "params": {
      "subAction": "listUsers",
      "subActionParams": {
        "limit": 2
      }
    }
  }'
```

The Okta mock returns three pages and five users. The response `_meta` contains
the page count, rate-limit headers, and the pinned declarative specification:

```json
{
  "declarativeSpec": {
    "id": ".declarative-okta",
    "version": "1.0.0"
  }
}
```

## 9. Run the sample workflows

Import or paste one of:

- `sample_abuseipdb_workflow.yaml`
- `sample_okta_workflow.yaml`

Replace each `REPLACE_WITH_*_CONNECTOR_ID` value with the connector saved object
ID created above. Run the workflow manually. The action types are:

- `declarative-abuseipdb.checkIp`
- `declarative-abuseipdb.reportIp`
- `declarative-okta.listUsers`
- `declarative-okta.getLogs`

## 10. Demonstrate out-of-band refresh and version pinning

1. Copy a YAML definition to a new immutable version path.
2. Change its top-level `version`.
3. Compute the new exact-file hash:

   ```sh
   shasum -a 256 path/to/new-version.yaml
   ```

4. Add the new path, version, and `sha256:<hex digest>` to `catalog.json`
   without removing the old version.
5. Point `activeVersions` at the new version.
6. Increment `catalogVersion`.
7. Wait for the 10-second refresh interval, or refresh immediately:

   ```sh
   curl -u elastic:changeme \
     -H 'kbn-xsrf: poc' \
     -H 'x-elastic-internal-origin: Kibana' \
     -X POST \
     http://127.0.0.1:5601/internal/stack_connectors/declarative_catalog/_refresh
   ```

8. Confirm the health endpoint shows the new active version.

Existing connector instances continue to report and execute their old pinned
version. New connector instances pin the new active version. The service keeps
both immutable bodies in the restricted system index.

Do not modify a published body in place. A content change is a new version.

## 11. Demonstrate last-known-good fallback

1. Create both connectors and execute them once.
2. Stop `serve_catalog.mjs`.
3. Restart Kibana while leaving Elasticsearch running.
4. Check catalog health.
5. Execute both connectors again.

Kibana loads the catalog and both immutable bodies from its restricted system
index. Health remains `ready: true` and reports the failed remote refresh in
`lastError`. Existing connector execution does not depend on the catalog
server.

To prove invalid publications are rejected, replace a catalog hash with
`sha256:` followed by 64 zeroes and wait for the next refresh. The health
endpoint reports the integrity error, keeps the previous active catalog, and
existing execution continues.

## Live vendor testing

For AbuseIPDB, use `https://api.abuseipdb.com` as Base URL and enter a real API
key.

For Okta, use the organization base URL without `/api/v1` and enter a raw SSWS
token. The YAML adds the SSWS prefix. OAuth and Okta write actions are
intentionally outside this PoC.

Add the live hostnames to `xpack.actions.allowedHosts` before restarting
Kibana.

## Validation

The focused tests are:

```sh
node scripts/jest \
  x-pack/platform/plugins/shared/stack_connectors/server/declarative_connectors
```

Run scoped repository checks with:

```sh
node scripts/check
```
