# @kbn/evals-suite-llm-tasks

Retriever-focused evaluation suites for the `@kbn/llm-tasks-plugin`.

## Quick Start

```bash
# Start Scout server
node scripts/scout.js start-server --stateful

# Run evaluations
node scripts/playwright test --config x-pack/platform/packages/shared/ai-infra/kbn-evals-suite-llm-tasks/playwright.config.ts
```

## Retrieve Documentation Task

This suite evaluates the `retrieveDocumentation` task implementation directly (not a tool wrapper).

```bash
node scripts/playwright test --config x-pack/platform/packages/shared/ai-infra/kbn-evals-suite-llm-tasks/playwright.config.ts evals/retrieve_documentation/retrieve_documentation.spec.ts
```

