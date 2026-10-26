# @kbn/anonymization-ui

Shared UI package for anonymization profile configuration in Stack Management and embedded solution surfaces.

## Scope

This package provides reusable anonymization UI components, hooks, and shared contracts.

- Reusable composition for Stack Management and solution-hosted surfaces.
- Public section-level and form-level APIs for different host integration needs.

## Host integration contract

For the section-level API (`AnonymizationProfilesSection`), hosts provide:

- `fetch`: `HttpSetup['fetch']`
- `spaceId`: active Kibana space identifier
- `canShow`: whether the section should be visible
- `canManage`: whether create/edit/delete actions are enabled
- optional callbacks:
  - `listTrustedNerModels`
  - `fetchPreviewDocument`
  - `onCreateSuccess` / `onUpdateSuccess` / `onDeleteSuccess`
  - `onCreateConflict` / `onOpenConflictError`

Hosts are responsible for deriving these values from their capabilities/services context.

### Trusted NER model behavior

When `listTrustedNerModels` is provided:

- `0` models: NER rule creation/editing is disabled and a warning is shown.
- `1` model: the model is auto-applied and rendered read-only in the NER panel.
- `>1` models: users can select a model from the dropdown (current behavior).

## Ownership boundaries

Package-owned:

- profile management UI primitives and behavior contracts.
- mode derivation (`manage`, `readOnly`, `hidden`) from host context.
- shared API and adapter layer for anonymization profiles endpoints.
- shared API and adapter layer for anonymization profiles and replacements endpoints.
- internal profiles UI building blocks used by section and form compositions.

### Package structure

- `src/anonymization_profiles_section`: section-level orchestration and list/delete flows.
- `src/profile_form`: controlled form composition (`ProfileFormProvider`, `ProfileFormContent`, `ProfileFormFooter`) and form-specific hooks.
- `src/profile_form/panels/*_panel`: panel UI implementations and colocated tests
  (for example `field_rules_panel`, `regex_rules_panel`, `ner_rules_panel`, `preview_panel`).
- `src/common/services`: shared API clients and React Query hooks used by section and form surfaces.
- `src/index.ts`: package public surface; section hooks are exported from `anonymization_profiles_section` and form primitives from `profile_form`.

Host-owned:

- app routing, page chrome, breadcrumbs, and navigation integration.
- modal, flyout, or inline page shell and close lifecycle integration.
- host-specific telemetry and feature-flag wiring.

## Current status

The package contains the active anonymization profile UI implementation used by GenAI Settings.

## Public exports

Import from `@kbn/anonymization-ui`:

- section-level:
  - `AnonymizationProfilesSection`
  - `useProfilesListView`
  - `useDeleteProfileFlow`
- form-level:
  - `ProfileFormProvider`
  - `ProfileFormContent`
  - `ProfileFormFooter`
  - `ProfileForm`
  - `ProfileFlyout`
- services:
  - `createAnonymizationProfilesClient`
  - `createAnonymizationReplacementsClient`
  - `useResolveAnonymizedValues`

Avoid deep imports from `src/*`; use the package public surface.

## Integration levels

- section-level integration: use `AnonymizationProfilesSection` for the full profiles experience with host-provided capabilities/services wiring.
- form-level integration: use `ProfileFormProvider` + `ProfileFormContent` + `ProfileFormFooter` when you need full control over container and orchestration.

### Section-level example

```tsx
<AnonymizationProfilesSection
  fetch={services.http.fetch}
  spaceId={activeSpaceId}
  canShow={canShowAnonymization}
  canManage={canManageAnonymization}
  listTrustedNerModels={listTrustedNerModels}
  fetchPreviewDocument={fetchPreviewDocument}
  onCreateSuccess={onCreateSuccess}
  onUpdateSuccess={onUpdateSuccess}
  onDeleteSuccess={onDeleteSuccess}
  onCreateConflict={onCreateConflict}
  onOpenConflictError={onOpenConflictError}
/>
```

## Composable profile form

The profile editing/creation flow is available as container-agnostic building blocks:

- `ProfileFormProvider`
- `ProfileFormContent`
- `ProfileFormFooter`
- `ProfileForm` (inline convenience wrapper)

The form remains fully controlled. `ProfileFormProvider` takes the same controlled props as `ProfileFlyout` (`isEdit`, values, validation errors, callbacks, `fetch`, `onCancel`, `onSubmit`).

### Show anonymized values compatibility

Shared surfaces that need to render de-anonymized values can support both paths below without
breaking existing integrations:

1. ID-based replacements resolution (preferred): provide `replacementsId` and let the UI resolve
   tokens from `/internal/inference/anonymization/replacements/{id}`.
2. Inline metadata fallback (Observability-compatible): provide `inlineDeanonymizations`
   (`entity.mask` -> `entity.value`) when replacement IDs are not available in the host payload.

When both are provided, ID-based replacements take precedence and inline metadata remains a
non-breaking compatibility path.

#### Where `replacementsId` comes from

`replacementsId` is produced by the Inference chat anonymization pipeline and returned in response
metadata (`metadata.anonymization.replacementsId`). It is not generated by `@kbn/anonymization-ui`.

Typical host flow:

1. Call Inference chat APIs with anonymization enabled.
2. Read `metadata.anonymization.replacementsId` from chat response/events.
3. Persist/carry that ID in host state for the relevant conversation turn.
4. Pass `replacementsId` into shared anonymization UI surfaces that need de-anonymized rendering.
5. Shared UI resolves token values via
   `/internal/inference/anonymization/replacements/{id}`.

If no `replacementsId` is available (for example legacy payloads or host-specific transports),
hosts can pass `inlineDeanonymizations` as the non-breaking fallback path.

### Flyout composition

```tsx
<ProfileFormProvider {...controlledProps}>
  <EuiFlyout onClose={controlledProps.onCancel} ownFocus size="m">
    <EuiFlyoutHeader hasBorder>{/* title/description */}</EuiFlyoutHeader>
    <EuiFlyoutBody>
      <ProfileFormContent />
    </EuiFlyoutBody>
    <EuiFlyoutFooter>
      <ProfileFormFooter />
    </EuiFlyoutFooter>
  </EuiFlyout>
</ProfileFormProvider>
```

### Modal composition

```tsx
<ProfileFormProvider {...controlledProps}>
  <EuiModal onClose={controlledProps.onCancel}>
    <EuiModalHeader>{/* title */}</EuiModalHeader>
    <EuiModalBody>
      <ProfileFormContent />
    </EuiModalBody>
    <EuiModalFooter>
      <ProfileFormFooter />
    </EuiModalFooter>
  </EuiModal>
</ProfileFormProvider>
```

### Inline page composition

```tsx
<ProfileFormProvider {...controlledProps}>
  <EuiPageTemplate.Section>
    {/* optional title/description */}
    <ProfileFormContent />
    <ProfileFormFooter />
  </EuiPageTemplate.Section>
</ProfileFormProvider>
```

### Editing by profile id without `ProfilesTable`

Use `useProfileEditor` to load an existing profile by id and drive controlled form props:

```tsx
const { form, isLoadingProfile, loadError } = useProfileEditor({
  client,
  context: { spaceId },
  profileId,
});

if (isLoadingProfile) {
  return <EuiLoadingSpinner />;
}

if (loadError) {
  return <EuiCallOut color="danger" title={loadError.message} />;
}

return (
  <ProfileFormProvider
    isEdit={form.isEdit}
    isManageMode={isManageMode}
    name={form.values.name}
    description={form.values.description}
    targetType={form.values.targetType}
    targetId={form.values.targetId}
    fieldRules={form.values.fieldRules}
    regexRules={form.values.regexRules}
    nerRules={form.values.nerRules}
    nameError={form.validationErrors.name}
    targetIdError={form.validationErrors.targetId}
    fieldRulesError={form.validationErrors.fieldRules}
    regexRulesError={form.validationErrors.regexRules}
    nerRulesError={form.validationErrors.nerRules}
    submitError={form.submitError}
    isSubmitting={form.isSubmitting}
    onNameChange={form.setName}
    onDescriptionChange={form.setDescription}
    onTargetTypeChange={form.setTargetType}
    onTargetIdChange={form.setTargetId}
    onFieldRulesChange={form.setFieldRules}
    onRegexRulesChange={form.setRegexRules}
    onNerRulesChange={form.setNerRules}
    fetch={fetch}
    onCancel={onCancel}
    onSubmit={async () => {
      await form.submit();
    }}
  >
    <ProfileFormContent />
    <ProfileFormFooter />
  </ProfileFormProvider>
);
```
