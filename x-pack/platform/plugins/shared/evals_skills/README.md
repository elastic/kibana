# Evals skills plugin

The **Evals skills plugin** (`@kbn/evals-skills-plugin`) registers [Agent Builder](../agent_builder) skills for the evals domain, letting users manage evaluation datasets and compose and run LLM evaluation experiments conversationally from an Agent Builder chat.

It is a server-only "glue" plugin: it depends on both `agentBuilder` and `evals` so that neither of those plugins has to depend on the other (which would create a dependency cycle).

## Gating

The plugin has no `enabled` flag of its own. It follows the evals feature flag (`xpack.evals.enabled`, off by default): during `setup` it checks the `evals` plugin contract and skips registering its skills when the feature is disabled.

## Skills

### `eval-experiment-authoring`

Composes, previews, saves, and runs evaluation experiments for Agent Builder agents and tools. It calls the same preview/save/run routes as the evals UI, so the outcome is identical — see [Workflow-based experiment execution › From Agent Builder](../evals/README.md#from-agent-builder) in the evals plugin.

The skill bundles these inline tools (in the recommended discover → preview → save/run order):

| Tool                        | Purpose                                                          |
| --------------------------- | --------------------------------------------------------------- |
| `platform.evals.experiments.list_datasets` | List evaluation datasets available as experiment inputs. |
| `platform.evals.list_evaluators`  | List evaluators (with `kind` and whether a judge connector is needed). |
| `platform.evals.list_targets`     | List task targets (inference model, agent, or tool).      |
| `platform.evals.list_connectors`  | List model connectors usable as the experiment/judge model. |
| `platform.evals.preview_experiment` | Generate the experiment workflow YAML without running it. |
| `platform.evals.save_experiment`  | Persist the experiment as a reusable workflow.            |
| `platform.evals.run_experiment`   | Launch the experiment (with confirmation) and return result links. |

### `eval-dataset-management`

Finds, inspects, creates, edits, copies, and deletes evaluation datasets in the active space. Every write asks the user to confirm first.

| Tool                                    | Purpose                                                              |
| --------------------------------------- | -------------------------------------------------------------------- |
| `platform.evals.datasets.list_datasets` | List datasets (optionally by name, tag, or maturity).                |
| `platform.evals.get_dataset`            | Read a dataset and a page of its examples (`offset` pages further).  |
| `platform.evals.create_dataset`         | Create a dataset; fails when the name is taken.                      |
| `platform.evals.upsert_dataset`         | Create or replace a dataset's full example set by name.              |
| `platform.evals.edit_examples`          | Add examples and/or remove examples by id, keeping the rest.         |
| `platform.evals.copy_dataset`           | Copy a dataset and its examples under a new name.                    |
| `platform.evals.delete_dataset`         | Remove a dataset from this space, deleting it if no other space has it. |

Inline tool ids must be unique across skills: Agent Builder renames colliding ids, so each skill has its own `list_datasets`. A skill may also define at most 7 inline tools, which is why adding and removing examples share one tool.

The inline tools inherit the skill's availability, so they are gated by the same feature flag.

## Related

- [`evals` plugin](../evals/README.md) — the UI, server routes, and workflow steps these skills drive.
- [`@kbn/evals`](../../../packages/shared/kbn-evals/README.md) — the wider evaluation framework and its entry points.
