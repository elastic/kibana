# Lens visualizations: Agent Context

Every setting a user can configure in a visualization's editor is part of the public Lens as code API. When you add one here, or a new option to an existing one, add it to the API (schema, both transforms, round-trip tests) in the same PR. Never exclude the new value from the transforms or throw on it at export.

Follow [Lens as code](../../../../../../../src/platform/packages/shared/kbn-lens-embeddable-utils/config_builder/AGENTS.md).
