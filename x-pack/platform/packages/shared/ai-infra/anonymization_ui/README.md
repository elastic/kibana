# @kbn/anonymization-ui

Shared UI package for anonymization profile configuration in Stack Management and embedded solution surfaces.

## Scope

This package provides reusable anonymization UI components, hooks, and shared contracts.

- Reusable composition for Stack Management and solution-hosted surfaces.
- Shared host context contracts (capabilities, services, and active space id).

## Host-provided services contract

Hosts are expected to provide:

- `capabilities`: anonymization visibility and management capability flags.
- `services`: browser services required by the package (for example HTTP and notifications).
- `spaceId`: active Kibana space identifier.

## Ownership boundaries

Package-owned:

- profile management UI primitives and behavior contracts.
- mode derivation (`manage`, `readOnly`, `hidden`) from host context.
- shared API and adapter layer for anonymization profiles endpoints.
- composable profiles components (`ProfilesToolbar`, `ProfilesTable`, `ProfileFlyout`, `DeleteProfileModal`) that hosts can orchestrate.

### Package structure

- `src/profiles/state`: profiles state and feature hooks.
- `src/profiles/components/<sub_component>`: UI sub-components and colocated UI hooks.
- `src/profiles/services`: API clients, query hooks, and lookup services.

Host-owned:

- app routing, page chrome, breadcrumbs, and navigation integration.
- modal or sheet shell and close lifecycle integration.
- host-specific telemetry and feature-flag wiring.

## Current status

The package contains the active anonymization profile UI implementation used by GenAI Settings.

## Composable profile form

The profile editing/creation flow is available as container-agnostic building blocks:

- `ProfileFormProvider`
- `ProfileFormContent`
- `ProfileFormFooter`
- `ProfileForm` (inline convenience wrapper)

The form remains fully controlled. `ProfileFormProvider` takes the same controlled props as `ProfileFlyout` (`isEdit`, values, validation errors, callbacks, `fetch`, `onCancel`, `onSubmit`).

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
