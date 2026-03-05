# Workflow test design

When a user creates a data source, production runs: `loadWorkflows` (read YAML, render Mustache templates) → name prefixing → `updateYamlField` (rewrite YAML) → `createWorkflow` (validation + storage, inside the workflows plugin).

The previous test helper called `createDataSourceAndRelatedResources` directly, requiring 5 mock objects (savedObjectsClient, agentBuilder, actions, etc.) irrelevant to workflow processing — fragile orchestration that breaks if any unrelated dependency changes.

Using a real `WorkflowsService` isn't viable: it's an unexported internal of `workflows_management`, and instantiating it requires its full dependency tree (taskManager, security, spaces, etc.).

Instead, we extract the workflow-specific part of `createDataSourceAndRelatedResources` into `loadAndPrepareWorkflows` — doing real `loadWorkflows` + real name prefixing + real `updateYamlField`. Tests then call `validateWorkflowYaml` (the same function `createWorkflow` calls internally) on the output. The aim is to exercise the real YAML loading, mutation, and validation code paths without mocking infrastructure unrelated to workflows, and without changing production behavior. The mock boundary sits where the plugin contract boundary sits — at `createWorkflow`.
