# PoC: Execute connectors sub-feature privilege

This is a proof of concept. It is not for merge.

It closes the gap where Actions `read` can execute connectors. It does that with the feature deprecation framework, so existing custom roles keep working until an admin changes them.

## Design

Two layers control connector execution.

1. **Feature privilege ceiling.** This PoC. A role can execute only if it holds the `execute` sub-feature (or `all`, which includes it).
2. **Object-level security (OLS).** Per connector. Owner-set. Public by default. See RFC PR #302232.

Combined rule: execute is allowed only if the ceiling allows it and OLS allows it.

OLS cannot grant access above the ceiling. A connector marked public still cannot run for a role that lacks `execute`.

## Privilege shape

New feature id: `actions_v2`. Same name, category, order, app, management, and AI index as `actions`.

| Privilege | What it grants |
| --- | --- |
| `read` / `minimal_read` | Show, list, get. OAuth api tag. `connector_token`, `oauth_state`, `user_connector_token` write. No `action_task_params` write. No `execute` UI. |
| `all` | Today's `all`, minus `action_task_params` and minus `ui: execute` on the privilege itself. |
| `execute` | Api tag `actions:execute-connectors`. Saved object `all` on `action_task_params`. UI `execute`. `includeIn: 'all'`. Independent group. |
| `endpoint_security_execute` | Unchanged. Independent. `includeIn: 'all'`. |

`includeIn` is `'all'`, not `'read'`. `'read'` would fold execute back into read and leave the gap open. Readers must opt in. `all` keeps today's behavior. `minimal_all` does not include `execute`.

Enforcement is the api tag plus the existing saved-object checks. `ActionsAuthorization` `execute` asks for all 3 in one `checkPrivileges` call:

- `action` get
- `action_task_params` create
- `api:actions:execute-connectors`

Saved-object checks alone are not enough. `read` already had `action` get and `action_task_params` create. The api tag is the explicit signal, same pattern as endpoint security. System actions and `additionalPrivileges` are unchanged. Endpoint security connectors still add their own tag on top.

Code:

- `x-pack/platform/plugins/shared/actions/server/feature.ts`
- `x-pack/platform/plugins/shared/actions/server/authorization/actions_authorization.ts`

## Backward compatibility

Custom roles that still hold the deprecated `actions` feature keep their current grants.

`replacedBy` copies UI actions only. It does not copy api or saved-object actions. The deprecated `all` and `read` privileges therefore keep the new api tag in their own `api` arrays. That is why a legacy `feature_actions.read` role can still execute.

Mappings:

| Deprecated privilege | `default` | `minimal` |
| --- | --- | --- |
| `all` | `actions_v2.all` | `actions_v2.minimal_all` + `execute` |
| `read` | `actions_v2.read` + `execute` | `actions_v2.minimal_read` + `execute` |
| `endpoint_security_execute` | `actions_v2.endpoint_security_execute` | same |

Old `read` maps to `read` + `execute`. The gap stays open for that role until an admin re-saves the role and unticks Execute connectors. That is intended.

The deprecated feature sets `excludeFromBasePrivileges: true`. Reviewers must confirm this framework detail.

`privileges.ts` still includes deprecated features in base `read` / `all` unless `excludeFromBasePrivileges` is set. With the flag, base `read` no longer comes from deprecated `actions`. It comes from `actions_v2.read`, which does not include execute.

Effect, not a role-file change:

- Base `read` (serverless `viewer`, Elasticsearch `viewer`) loses execute.
- Base `all` (editor, developer) keeps execute, because `actions_v2.all` includes the sub-feature.
- Explicit `feature_actions.read` / `feature_actions.all` on a role still uses the deprecated feature, so those roles keep execute until the role definition changes.

This PoC does not update built-in role files. See the list below.

## Built-in roles

Not changed in this PoC. When the deprecated feature is removed, or when these roles should opt in to the new shape, update the files below.

Serverless project roles (`src/platform/packages/shared/kbn-es/src/serverless_resources/project_roles/`):

| Project | Roles | Actions grant today |
| --- | --- | --- |
| `es`, `vectordb` | `viewer` | base `read` |
| `es`, `vectordb` | `developer` | base `all` |
| `es`, `vectordb` | `admin` | `*` |
| `oblt` | `viewer` | base `read` |
| `oblt` | `editor` | base `all` |
| `oblt` | `_nightshift_agent`, `_nightshift_automations` | `feature_actions.read` |
| `security` | `viewer`, `t1_analyst`, `t2_analyst`, `threat_intelligence_analyst`, `rule_author` | `feature_actions.read` |
| `security` | `editor`, `t3_analyst` | `feature_actions.read` + `endpoint_security_execute` |
| `security` | `soc_manager`, `detections_admin`, `platform_engineer`, `endpoint_operations_analyst`, `endpoint_policy_manager` | `feature_actions.all` |
| `security` | `_alertzero_alert_triage`, `_alertzero_attack_discovery`, `_alertzero_endpoint_analysis`, `_alertzero_threat_hunt`, `_alertzero_rule_tuning`, `_alertzero_rule_coverage` | `feature_actions.read` |
| `security/search_ai_lake` | `_search_ai_lake_analyst`, `_search_ai_lake_soc_manager` | `feature_actions.all` |

Also listed, not changed:

- Stateful copy: `src/platform/packages/shared/kbn-es/src/stateful_resources/roles.yml` (`viewer` base read, `editor` base all). Elasticsearch reserved roles are owned outside this repo (`ReservedRolesStore.java`, `alertzero_*`).
- Scout fixture: `x-pack/platform/plugins/shared/security/test/scout/api/fixtures/expected_builtin_roles_kibana_access.ts`
- Nightshift service accounts: `x-pack/solutions/observability/packages/kbn-nightshift-shared/src/service_accounts/service_account_roles.ts`
- Copies: `x-pack/solutions/security/plugins/security_solution/scripts/endpoint/common/roles_users/serverless/es_serverless_resources/roles.yml`, `x-pack/platform/plugins/shared/osquery/cypress/lib/kibana_roles/project_controller_security_roles.yml`, `x-pack/platform/packages/shared/kbn-cypress-test-helper/src/auth/common/ess_roles.json`

FTR and Scout fixtures that grant `actions: ['read']` or assert that a reader can execute need updates in a real PR. Examples:

- `x-pack/platform/test/alerting_api_integration/security_and_spaces/group2/tests/actions/execute.ts`
- `x-pack/platform/test/alerting_api_integration/security_and_spaces/group2/tests/actions/bulk_enqueue.ts`
- Privilege API snapshots: `x-pack/platform/test/api_integration/apis/security/privileges.ts`, `x-pack/platform/test/api_integration_basic/apis/security/privileges.ts`
- Feature id list: `x-pack/platform/test/api_integration/apis/features/features/features.ts`

## Consumers

"Denied for `actions_v2.read` only" means a role that holds the new read privilege and not `execute`. Legacy `feature_actions.read` is not that role. It still executes, because the deprecated privilege keeps the api tag.

| Consumer | Call path | Identity | Denied for `actions_v2.read` only? | Needs `actions_v2.execute` in its own privileges? | File to change |
| --- | --- | --- | --- | --- | --- |
| Cases push | `cases/server/client/cases/push.ts` (client from `cases/server/client/factory.ts`) | End user | Yes | Yes, if push should work without a separate Actions grant. Cases `server/features/v3.ts` grants no Actions saved objects. | Cases feature privileges |
| Alerting execution | `actions_client` `bulkEnqueueExecution`, from `alerting/server/task_runner/action_scheduler/action_scheduler.ts` | Rule API key | Yes, if the key was created without execute | The key copies the user who created, updated, or enabled the rule. Mint paths should require execute. | `alerting/server/rules_client/lib/create_new_api_key_set.ts` and the methods that call it |
| Alerting checks that already call `ensureAuthorized({ operation: 'execute' })` | `enable_rule`, `bulk_enable_rules`, `run_soon`, `update_rule_api_key`, `bulk_edit_rules`, `validate_authorize_system_actions` | End user, then API key | Yes for a read-only user | No new check. These already fail closed. | None for the check. Key grant still needs execute. |
| Alerting create | `create_rule.ts` does not check execute for regular connectors | End user, then API key | Runtime deny if the key lacks execute | Yes, when minting the key | `create_rule.ts`, `bulk_create/utils.ts`, `update/update_rule.ts`, `bulk_update/utils.ts`, `clone/clone_rule.ts`, `rules_client/common/bulk_edit/update_rule_in_memory.ts` |
| Inference | `inference/server/chat_complete/utils/inference_executor.ts` | End user. Routes have authz disabled. | Yes | Yes, on the caller, or the user must hold execute | Inference callers of `getClient({ request })` |
| Elastic Assistant and `@kbn/langchain` | `elastic_assistant/server/routes/post_actions_connector_execute.ts`, `routes/helpers.ts`, `kbn-langchain/server/language_models/llm.ts` | End user | Yes | Yes | Assistant feature, or require the user to hold execute |
| Observability AI Assistant | `observability_ai_assistant/server/service/index.ts`, `functions/execute_connector.ts` | End user | Yes | Yes | Assistant feature privileges |
| Agent Builder | `agent_builder/server/services/tools/builtin/connectors/execute_connector_sub_action.ts`, `tools/tool_types/mcp/tool_type.ts` | End user. Feature grants no Actions saved objects. | Yes | Yes | `agent_builder/server/features.ts` |
| Workflows execution engine | `workflows_execution_engine/server/connector_executor.ts`, `execution_functions/setup_dependencies.ts` | Cloned workflow API key | Yes, if the key lacks execute | Yes, on the key grant | Workflow API key creation |
| Nightshift | `nightshift_investigations/server/lib/notifications/send_investigation_notifications.ts`, `notify_investigation_quota_reached.ts`, `tools/slack_read/tool.ts`, `tools/sandbox_bash/connector_credentials.ts` | Service account. Roles grant `feature_actions.read` today, so they still execute. | Yes, after the role moves to `actions_v2.read` | Yes | `kbn-nightshift-shared/src/service_accounts/service_account_roles.ts` |
| Notifications | `notifications/server/services/connectors_email_service.ts` | Unsecured client | No | No | None |
| Security Solution response actions, user path | `security_solution/server/endpoint/routes/actions/response_actions.ts` and the SentinelOne, CrowdStrike, and Defender clients | End user | Yes, unless the role also has `execute` and `endpoint_security_execute` | Yes for the user path | Security roles, not the route |
| Security Solution automated response | `endpoint_app_context_services.ts` background task | Unsecured | No | No | None |

Also request-scoped, same rule (denied for `actions_v2.read` only, not changed here): Cases system connector and workflow steps, Discoveries / attack discovery, Slack relay API key in `significant_events/server/lib/slack_app/service.ts` (`actions: ['read']`).

Read-only callers are not affected. They list or get connectors and do not execute.

## Capabilities

Deprecated features are omitted from default UI capabilities (`features/server/plugin.ts` uses `omitDeprecated: true`). A role that only holds `actions_v2` would otherwise see `capabilities.actions` as missing.

This PoC registers a provider that creates `actions.show`, `actions.execute`, `actions.save`, `actions.delete`, and `actions.endpointSecurityExecute` (default false). A switcher copies `capabilities.actions_v2.<each>` into `actions.<each>`. If `actions_v2` is missing, the switcher returns `{}`.

Comment in code: PoC alias so existing `capabilities.actions.*` readers keep working. The final PR should migrate readers.

Code: `x-pack/platform/plugins/shared/actions/server/lib/actions_capabilities_alias.ts`

Reviewers should confirm switcher order. Security registers its switcher first (`capabilityPath: '*'`). Actions lists security as optional, so this switcher runs after and can overwrite `actions.*`. If that order changes, the alias stops working.

Reader call sites to migrate later. Helper:

- `x-pack/platform/plugins/shared/triggers_actions_ui/public/application/lib/capabilities.ts`

`execute` readers:

- `triggers_actions_ui` connector flyout header, rules list, rule details, rule definition, connectors list
- `x-pack/platform/packages/shared/response-ops/rule_form` `edit_rule_form.tsx`, `utils/get_edit_rule_permissions.ts`
- `x-pack/solutions/observability/plugins/observability/public/pages/rule_details/helpers/is_rule_editable.ts`
- `elastic_assistant` `use_assistant_availability.ts`
- `security_solution` onboarding `connectors/authz.ts`, `siem_migrations/common/service/capabilities.ts`
- `observability_ai_assistant_management` settings page
- `ai_anonymization_settings` plugin
- `gen_ai_settings` plugin
- `agent_builder` `use_has_connectors_all_privileges.ts`
- `nightshift` `use_agent_connectors.tsx`

`show`, `save`, and `delete` use the same key space (about 45 files): triggers_actions_ui forms and lists, Cases, context engine, Agent Builder connectors table, streams, nightshift, uptime, synthetics, security_solution rule actions. The alias covers them for this PoC.

## Serverless rollout

Controller roles are rebuilt outside this repo. `viewer` uses base `read`, so it loses execute as soon as this Kibana is the one registering privileges. `editor` uses base `all` and keeps execute. Explicit `feature_actions.*` roles keep the deprecated grants until the controller role files change. Ordering matters: update controller roles in the same window as the Kibana rollout, or accept the base-read change first.

Zero-downtime upgrade:

- Old nodes do not know `actions_v2`.
- A role saved in the new role UI is stored as `actions_v2` privileges.
- An old node does not apply those privileges. That role loses Actions until every node is new.
- Mixed-version window: avoid re-saving roles that should keep Actions on old nodes.

Rollback:

- `actions_v2` privileges stay in the `.security` application until a node rewrites the privilege map.
- On startup, a node deletes Kibana privileges that are not in its own map, then writes its map (`security/server/authorization/register_privileges_with_cluster.ts`).
- An old node that restarts after upgrade removes `feature_actions_v2.*`. A new node restores them.
- A role re-saved on a new node during the window, then rolled back, no longer has a feature that reads `actions_v2`. That role loses Actions access after rollback.

## Basic license

Sub-feature privileges are not emitted on a Basic license (`allowSubFeaturePrivileges` is false). `all` still folds `includeIn: 'all'` sub-feature actions.

On Basic, the choice is `read` (no execute) or `all` (execute). There is no separate Execute connectors toggle.

## Manual verification

Automated:

```bash
node scripts/jest x-pack/platform/plugins/shared/actions/server/feature.test.ts
node scripts/jest x-pack/platform/plugins/shared/actions/server/authorization/actions_authorization.test.ts
node scripts/jest x-pack/platform/plugins/shared/actions/server/lib/actions_capabilities_alias.test.ts
node scripts/type_check --project x-pack/platform/plugins/shared/actions/tsconfig.json
```

`feature.test.ts` registers both features on `FeatureRegistry` and calls `validateFeatures()`. Kibana start is still a manual check. The features plugin validates again at start.

Manual, HTTP only for the privilege check. Create 3 roles and 3 users:

1. `actions_v2: ['read']`
2. `actions_v2: ['read', 'execute']`
3. `actions_v2: ['all']`

For each user, with an existing connector id:

- `GET /api/actions/connectors` returns 200
- `GET /api/actions/connector/{id}` returns 200
- `POST /api/actions/connector/{id}/_execute` returns 403 for plain read, and 200 for the other 2

UI: Connectors "Run" / test tab is hidden for plain read. It is visible for the other 2, via the capabilities alias.

Also:

- A legacy role `feature_actions: ['read']` can still execute.
- Kibana starts with no feature registry error.
- Role management UI shows "Actions and Connectors" with an "Execute connectors" sub-feature. The deprecated feature is not listed.

## Open questions

- Keep the capabilities alias, or migrate the reader call sites to `actions_v2` (or a shared helper) before merge?
- Should `connector_token`, `oauth_state`, and `user_connector_token` write leave `read`?
- Should alerting `create`, `update`, and `clone` check connector `execute` when they mint API keys?
- Serverless controller role updates, and the order versus the Kibana rollout.
- FTR and privileges API snapshot updates belong in the real PR, not this PoC.
- Confirm `excludeFromBasePrivileges` on the deprecated feature is the accepted way to drop execute from base `read`.

## What this PoC does not do

- No consumer, built-in role, or FTR fixture edits.
- No client call-site migration. The alias covers `capabilities.actions.*`.
- No OLS implementation. OLS stays a separate change (PR #302232).
