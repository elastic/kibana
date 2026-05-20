# Data Phases Components

This directory contains UI components used by the stream lifecycle data tiers flow.

Run `yarn storybook streams_app` from the Kibana root to preview these components locally.

## `EditDeletePhaseFlyout`

`edit_delete_phase_flyout/edit_delete_phase_flyout.tsx` configures the delete phase retention for stream lifecycle data. It supports enabling the delete phase with a `Delete after` value, restoring the default retention period when one is available, removing the delete phase, and validating against an optional maximum retention period.

Use `onChange` for debounced draft updates while the user edits the form, such as previewing the resulting lifecycle configuration before it is saved. Use the committed action callback for the footer action that persists the current value. This mirrors the ILM phases flyout pattern, where `onChange` drives preview state and `onSave` commits the final configuration.

When `maximumRetentionPeriod` is provided, the flyout hides the remove action and validates that the delete phase happens before that maximum. When the delete phase is removed, the flyout calls `onSave({ deletePhaseEnabled: false })` and relies on the parent save handler to persist the change and close the flyout.
