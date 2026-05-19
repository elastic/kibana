# Data Phases Components

This directory contains UI components used by the stream lifecycle data tiers flow.

Run `yarn storybook streams_app` from the Kibana root to preview these components locally.

## `DefaultSnapshotRepositoryRequiredModal`

`default_snapshot_repository_required_modal/default_snapshot_repository_required_modal.tsx` is shown when a user tries to add a frozen ILM phase but no snapshot repositories are available. Frozen phases require a snapshot repository, so the modal asks the user to create a default repository before refreshing the lifecycle panel.

The create action is rendered as a filled `EuiSplitButton.ActionPrimary` link. The parent should provide `createDefaultRepositoryUrl` with `application.getUrlForApp('management', { path: '/data/snapshot_restore/add_repository' })`, and the modal opens it with `target="_blank"` so the user can create the repository in Snapshot and Restore without losing their current stream lifecycle context.

The refresh action is the split button secondary icon action. It stays in the modal and calls `onRefresh`, which should re-fetch snapshot repositories and continue the frozen phase flow once a repository exists. Because this action is icon-only, it must keep an accessible `aria-label`.

Use `EuiSplitButton` here instead of separate buttons so the create and refresh actions share the connected filled-button treatment from EUI. Avoid `EuiButtonGroup` for this case because it is intended for selection controls, not related actions.

## `EditDeletePhaseFlyout`

`edit_delete_phase_flyout/edit_delete_phase_flyout.tsx` configures the delete phase retention for stream lifecycle data. It supports enabling the delete phase with a `Delete after` value, restoring the default retention period when one is available, removing the delete phase, and validating against an optional maximum retention period.

Use `onChange` for debounced draft updates while the user edits the form, such as previewing the resulting lifecycle configuration before it is saved. Use the committed action callback for the footer action that persists the current value. This mirrors the ILM phases flyout pattern, where `onChange` drives preview state and `onSave` commits the final configuration.

When `maximumRetentionPeriod` is provided, the flyout hides the remove action and validates that the delete phase happens before that maximum. When the delete phase is removed, the flyout calls `onSave({ deletePhaseEnabled: false })` and relies on the parent save handler to persist the change and close the flyout.

