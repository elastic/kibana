# GitHub Workflows

This directory contains workflow YAML files for the GitHub data connector.

## File Naming Convention

- **`.tool.yaml`** - Workflows that should generate Agent Builder tools
  - Example: `search_issues.tool.yaml`
- **`.yaml`** - Workflows that should NOT generate Agent Builder tools
  - Example: `internal_workflow.yaml`

## Template Variables

Workflow YAML files can use the following template variables:

- `{{stackConnectorId}}` - Replaced with the actual stack connector ID at runtime

## Example Workflow

```yaml
version: '1'
name: 'sources.github.search_issues'
description: 'Search for issues in a GitHub repository'
enabled: true
triggers:
  - type: 'manual'
inputs:
  - name: owner
    type: string
  - name: repo
    type: string
steps:
  - name: search-issues
    type: github.searchIssues
    connector-id: {{stackConnectorId}}
    with:
      owner: "${{inputs.owner}}"
      repo: "${{inputs.repo}}"
```

## Migration from generateWorkflows()

To migrate from the old `generateWorkflows()` approach to `workflowsDir`:

1. Create a `workflows` directory next to your `data_type.ts` file
2. Convert each workflow from your `workflows.ts` file to a separate YAML file
3. Use the `.tool.yaml` suffix for workflows with `shouldGenerateABTool: true`
4. Replace template string interpolation (e.g., `${stackConnectorId}`) with `{{stackConnectorId}}`
5. Update your `data_type.ts` to use `workflowsDir` instead of `generateWorkflows()`
6. Remove the old `workflows.ts` file

See `data_type_with_workflows_dir.example.ts` for a complete example.