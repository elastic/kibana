# @kbn/connector-provisioning-plugin

Registers the `connector-provisioning.provisionConnectorFromSecret` Workflow step: it reads one or more fields from a secret-resolving connector (for example, [HashiCorp Vault](/docs/reference/connectors-kibana/hashicorp-vault-action-type.md)) and uses them to create or update another Kibana connector, with no human in the loop and without ever returning the resolved values as step output.

See the [HashiCorp Vault connector docs](/docs/reference/connectors-kibana/hashicorp-vault-action-type.md#hashicorp-vault-provisioning-example) for an end-user-facing example, and the design plan this plugin implements for the full threat model and API contract.

## Why this exists

Generic execution surfaces — the HTTP `_execute` API, Workflow execution history, and Agent Builder/LLM context — must never see a value sourced from a secrets connector. `connector_provisioning`'s step is the sole intended, statically-checked direct caller of the actions plugin's sensitive-output capability token (`SENSITIVE_OUTPUT_ACCESS_TOKEN`): it can see the real value returned by a `sensitiveOutput: true` action (like `.hashicorp_vault`'s `readSecret`) in order to route it directly into a new or updated connector's `config`/`secrets`, but it never echoes that value back out.

## Structure

- `common/step_types/provision_connector_from_secret.ts` — the step's shared (server + eventual public) definition: input/output Zod schemas, the step type ID, and the example YAML shown in the Workflows step catalog.
- `server/step_types/field_classification.ts` — resolves the target connector's `authType` and classifies each candidate field name as `config` or `secrets`, per the target connector spec's own schema.
- `server/step_types/field_source_resolution.ts` — validates `fieldBindings`, resolves each target field to exactly one source (a Vault path, `targetConnectorConfig`/`targetConnectorSecrets`, or an explicit override), and fails fast on any collision. Vault-sourced values may only populate the target connector's **secrets** fields; a binding that would write a Vault value into a cleartext config field is rejected (config must be supplied as a literal via `targetConnectorConfig`).
- `server/step_types/read_vault_paths.ts` — reads the required Vault paths via the configured secret-resolving connector's `readSecret` action.
- `server/step_types/upsert_connector.ts` — creates or updates the target connector, including the `actionTypeId` match check on `mode: 'upsert'`, and sanitizes any `create()`/`update()` failure so the underlying error text is never forwarded.
- `server/step_types/provision_connector_from_secret.ts` — wires the above into the step's `execute` handler.

## Non-goals (v1)

Legacy (non-spec) connector types; Vault KV v1; Vault OIDC/OAuth auth; dynamic Vault secrets engines; connector lifecycle/deletion management; cross-space provisioning (the resulting `ActionsClient` operates in the triggering/scheduling identity's space, with no cross-space override).
