# Metric runtime state

Converts persisted **visualization state** to the shape the current metric chart expects.

Saved objects get the same updates from content-management version transforms. By-value dashboard panels skip that path, so `convertToRuntimeState` re-applies the converters when persisted metric state is opened in the Lens editor (`initialize`) and when a dashboard panel is opened for inline edit.

Converters are vis-state only and idempotent. They live in `converters/` and include the v1 metric transform plus follow-ups for density, color target, title weight, and secondary name visibility.
