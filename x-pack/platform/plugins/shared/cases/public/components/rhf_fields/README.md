# Cases react-hook-form field wrappers

Replacement for `@kbn/es-ui-shared-plugin/static/forms` (deprecated `hook_form_lib`) in Cases forms.
Validation lives in a zod schema passed through `zodResolver` (`public/utils/zod_resolver.ts`);
wrappers never take `rules`.

## Wrappers

`TextField`, `TextareaField`, `SelectField`, `ComboBoxField`, `ToggleField`, `NumberField`, `HiddenField`.
Each reads the form from `FormProvider` and takes `name`, `label`, `labelAppend`, `helpText`,
`data-test-subj` and `euiFieldProps` for the underlying EUI component. Errors are rendered by the shared
`FieldRow`, so they look the same everywhere.

Value types: text/textarea/select/hidden `string`, combobox `string[]` (labels), toggle `boolean`,
number `number | undefined` (empty input).

## Conventions (instead of `useFormData`, `useForm` from the lib)

| hook_form_lib | react-hook-form |
| --- | --- |
| `useForm({ schema, defaultValue })` | `useForm({ resolver: zodResolver(schema), defaultValues, mode: 'onChange' })` |
| `<Form form={form}>` | `<FormProvider {...methods}>` |
| `useFormData({ watch })` | `useWatch({ control, name })` to re-render on change; `getValues()` for one-off reads |
| `form.submit()` | `handleSubmit(onValid, onInvalid)`; `onValid` receives the parsed values |
| `form.reset()` / `form.setFieldValue` | `reset(values)` / `setValue(name, value, { shouldDirty: true })` |
| `form.isValid` / `isSubmitting` | `formState.isValid` / `formState.isSubmitting` (read before render so RHF subscribes) |

## Testing

`renderWithForm({ schema, defaultValues, children })` from `./test_utils` renders the children in a form
validated by the schema, with a "Submit" button, and returns `form()`, `onValid` and `onInvalid`.
Wrap imperative form calls such as `reset()` in `act`.

## Markdown editor

`MarkdownField` (`markdown_editor/markdown_field.tsx`) is the react-hook-form markdown editor: `name`, `id`,
`dataTestSubj`, `idAria`, plus the existing editor props (`draftStorageKey`, `caseId`, `bottomRightContent`...).
The editor internals only need a `MarkdownValueControl` (`{ value, setValue }`), which both hook_form_lib's
`FieldHook<string>` (`MarkdownEditorForm`) and `MarkdownField` satisfy, so lanes can migrate one form at a time.

## Assignees

`AssigneesField` (`rhf_fields/assignees_field.tsx`) is the user profile picker, default `name="assignees"`, value
`{ uid }[]`. Put `assigneesFieldSchema` (limit of `MAX_ASSIGNEES_PER_CASE`) in the parent zod schema.

## Connector fields

Contract in `connectors/connector_fields_contract.ts`:

- The parent renders `<FormProvider>` and `<ConnectorFieldsForm>`; connector `fieldsComponent`s use
  `useFormContext` and bind fields under `fields.*` with `getConnectorFieldName(key)`.
- Validation: set `fieldsSchema` (zod) on the registered `CaseConnector`; the parent puts
  `getConnectorFieldsSchema(connector)` at `schema.fields` and rebuilds its resolver when the connector changes.
- Set `defaultFields` for every validated key and initialise the form with `getConnectorDefaultFields(connector)`;
  without values, schema errors are reported on `fields` and no field shows them.
- Read sibling values with `useConnectorFields<T>()` (instead of `useFormData<{ fields }>()`).
- react-hook-form keeps values of unmounted fields: call `useResetConnectorFields()(newConnector)` from the
  connector selector's change handler, or the previous connector's values are submitted.
