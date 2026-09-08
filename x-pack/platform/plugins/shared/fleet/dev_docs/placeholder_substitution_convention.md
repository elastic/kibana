# Placeholder substitution convention for package-shipped Kibana assets

**Status:** implemented
**Applies to:** Fleet package workflow assets and Agent Builder agent assets
**Source of truth:** `x-pack/platform/plugins/shared/fleet/server/services/epm/packages/install_state_machine/steps/step_install_workflow_assets.ts`

## Problem

A Fleet package is a static archive. It cannot know the connector IDs of the
stack it will be installed on — those are created by the operator, after the
package is authored and often after it is installed.

So a packaged workflow cannot hardcode a connector ID, and it cannot be left
blank either: a workflow with an empty connector reference is invalid and will
not import.

## Convention

Package assets ship a **placeholder token** wherever a stack-specific value
belongs. At install time Fleet rewrites those tokens using the values of the
package policy vars.

The token is derived mechanically from the package policy var name:

```
REPLACE_WITH_ + <var name>.toUpperCase()
```

| Package policy var | Placeholder shipped in the asset |
| --- | --- |
| `github_connector_id` | `REPLACE_WITH_GITHUB_CONNECTOR_ID` |
| `slack_connector_id` | `REPLACE_WITH_SLACK_CONNECTOR_ID` |
| `jira_connector` | `REPLACE_WITH_JIRA_CONNECTOR` |

The recognised token shape is `REPLACE_WITH_[A-Z0-9_]+`. Because the mapping is
derived from the var name, **no registry of placeholders exists and none is
needed** — declaring the var is what creates the placeholder.

### Authoring example

`manifest.yml`:

```yaml
vars:
  - name: github_connector_id
    type: text
    title: GitHub connector
    required: true
```

The shipped workflow YAML:

```yaml
steps:
  - name: fetch_issues
    type: github.runQueryTemplate
    connector-id: REPLACE_WITH_GITHUB_CONNECTOR_ID
    with:
      templateId: listIssues
```

After install, with the policy var set to `36977288-562c-41c8-ade3-53a0bc633a28`:

```yaml
    connector-id: 36977288-562c-41c8-ade3-53a0bc633a28
```

## Rules

1. **Uppercase the var name exactly.** `github_connector_id` →
   `REPLACE_WITH_GITHUB_CONNECTOR_ID`. Substitution is a literal string replace;
   a case mismatch silently leaves the placeholder in place.
2. **One placeholder may appear many times.** Replacement is `replaceAll`, so the
   same connector can be referenced by any number of steps.
3. **Never ship a real ID.** A hardcoded ID from a dev stack will not exist on
   the target stack and the workflow will fail at run time, not install time.
4. **Declare every referenced var.** A placeholder with no matching package
   policy var is left unresolved and logged as a warning:
   `Workflow placeholder REPLACE_WITH_X has no matching package policy var`.
   Unresolved workflows are imported disabled rather than silently broken.

## Reinstall and upgrade: carry-forward

The archive *always* contains placeholders — including on upgrade. A naive
reinstall would therefore overwrite a working, operator-configured workflow with
placeholder text and force-disable it, destroying live configuration on every
package upgrade.

To prevent this, install carries forward already-resolved values:

> For each placeholder still unresolved in the incoming YAML, reuse the value at
> the same key in the currently-installed workflow.

This is deliberately narrow, and the narrowness is the point:

- Only **placeholders** are filled. A key that already holds a real value in the
  incoming YAML is never touched, so package updates still win.
- The value is matched **by key**, not by position, so reordering steps in a new
  package version does not shuffle connector assignments.
- A carried-forward value that is itself a placeholder is ignored, so an
  unconfigured install does not propagate junk forward.

Net effect: an operator configures a connector once, and package upgrades keep
working without re-entering it.

## Where substitution runs

Both packaged asset types share one implementation, so the convention is
identical for each:

| Asset type | Install step |
| --- | --- |
| Workflows | `step_install_workflow_assets.ts` |
| Agent Builder agents | `step_install_agent_assets.ts` (calls the same `substituteWorkflowConnectorIds`) |

Sharing the implementation is intentional — an agent that references a connector
uses exactly the same token spelling as a workflow that references it.

## Failure modes

| Symptom | Cause | Fix |
| --- | --- | --- |
| Workflow imported but disabled, log warns about an unresolved placeholder | Placeholder has no matching package policy var | Add the var to `manifest.yml`, or correct the token spelling |
| Placeholder text still present after install | Case mismatch between var name and token | Uppercase the var name exactly |
| Workflow reverts to placeholders after upgrade | Carry-forward could not find the key | Keep the key name stable across package versions |
| Connector-not-found at run time | A real ID was shipped in the archive | Replace it with a placeholder |

## Related

- [Fleet package authoring guide (Kibana-only ETL)](./kibana_only_etl_package_authoring.md)
- [Workflow ETL cookbook](./workflow_etl_cookbook.md)
- [Agent Builder fleet agent authoring guide](./agent_builder_fleet_agents.md)
