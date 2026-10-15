# @kbn/feedback-registry

Allowed questions for `@kbn/feedback-plugin`. The registry lazily loads only the set for the current app. Apps without an entry fall back to the default questions.

The registry maps chrome app ids to lazy question loaders in `src/registry.ts`. Question sets live in `src/questions/` and are returned in `order` sequence.

See [Register application feedback questions](../../../../../docs-dev/feedback/index.md) for registration instructions and examples, and the [feedback UI guide](../../../../../docs-dev/kbn-ui/feedback.md) for the components that render them.
