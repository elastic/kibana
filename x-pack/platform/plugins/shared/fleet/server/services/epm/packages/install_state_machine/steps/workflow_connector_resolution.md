# Workflow connector-id / agent-id resolution

WF-008 chooses **install-time substitution** as the supported path.
Runtime Liquid (`{{ policy.vars.* }}`) is not implemented and must not be used
for connector-id or agent-id.

## Decision

Package workflow YAML uses `REPLACE_WITH_<VAR>` placeholders. Fleet replaces
them from package-policy vars:

- at package install (`stepInstallWorkflowAssets`)
- again when package-policy vars change (`updateWorkflowAssets`)

After substitution the saved workflow contains concrete ids. Execution-time
Liquid still interpolates workflow `consts` / `steps` / `inputs`; it does not
read live Fleet policy vars.

## Why not runtime Liquid

1. FLEET-004 already ships install-time substitution plus re-apply on policy
   update, which covers connector rotation without a new execution-time secret
   surface.
2. Runtime `policy.vars` would require the execution engine to depend on Fleet
   policy state on every run, including scheduled runs with no request context.
3. Leaving both paths undocumented would let package authors mix static consts
   and live policy lookups and get non-deterministic connector binding.

## Alignment with FLEET-004

- `substituteWorkflowConnectorIds` maps `varName` → `REPLACE_WITH_${VARNAME}`.
- Unresolved placeholders force the workflow disabled at install.
- Policy updates re-run substitution against the original package asset YAML,
  not against previously substituted consts.

## Authoring rule

```yaml
consts:
  githubConnectorId: REPLACE_WITH_GITHUB_CONNECTOR_ID
```

Not:

```yaml
consts:
  githubConnectorId: "{{ policy.vars.github_connector_id }}"
```
