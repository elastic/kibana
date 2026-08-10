# Evals skills plugin

The **Evals skills plugin** (`@kbn/evals-skills-plugin`) registers [Agent Builder](../agent_builder) skills for the evals domain, letting users compose and run LLM evaluation experiments conversationally from an Agent Builder chat.

It is a server-only "glue" plugin: it depends on both `agentBuilder` and `evals` so that neither of those plugins has to depend on the other (which would create a dependency cycle).

## Gating

The plugin has no `enabled` flag of its own. It follows the evals feature flag (`xpack.evals.enabled`, off by default): during `setup` it checks the `evals` plugin contract and skips registering its skills when the feature is disabled.

## Skills

### `eval-experiment-authoring`

Composes, previews, saves, and runs evaluation experiments for Agent Builder agents and tools. It calls the same preview/save/run routes as the evals UI, so the outcome is identical — see [Workflow-based experiment execution › From Agent Builder](../evals/README.md#from-agent-builder) in the evals plugin.

The skill bundles these inline tools (in the recommended discover → preview → save/run order):

| Tool                        | Purpose                                                          |
| --------------------------- | --------------------------------------------------------------- |
| `platform.evals.list_datasets`    | List evaluation datasets available as experiment inputs.  |
| `platform.evals.list_evaluators`  | List evaluators (with `kind` and whether a judge connector is needed). |
| `platform.evals.list_targets`     | List task targets (inference model, agent, or tool).      |
| `platform.evals.list_connectors`  | List model connectors usable as the experiment/judge model. |
| `platform.evals.preview_experiment` | Generate the experiment workflow YAML without running it. |
| `platform.evals.save_experiment`  | Persist the experiment as a reusable workflow.            |
| `platform.evals.run_experiment`   | Launch the experiment (with confirmation) and return result links. |

The inline tools inherit the skill's availability, so they are gated by the same feature flag.

## Related

- [`evals` plugin](../evals/README.md) — the UI, server routes, and workflow steps these skills drive.
- [`@kbn/evals`](../../../packages/shared/kbn-evals/README.md) — the wider evaluation framework and its entry points.
