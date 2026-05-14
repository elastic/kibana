# `@kbn/workflows-hitl-form`

Shared React package that provides the schema-driven `SchemaForm` component used by both the **Inbox** (`RespondFlyout`) and **Agent Builder** (`FormPrompt`) to render HITL (Human-in-the-Loop) input controls from a JSON Schema definition. Extracting this component into a standalone package guarantees a single source of truth for field rendering, validation, and agent-context display across all three HITL surfaces.

## Exports

| Export | Type | Description |
|---|---|---|
| `SchemaForm` | `React.FC<SchemaFormProps>` | Renders a JSON Schema object as EUI controls; shows an `EuiCallOut` for `agent_context` |
| `extractSchemaDefaults` | `(schema) => Record<string, unknown>` | Pulls `field.default` values; used to seed form state on mount |
| `validateSchemaValues` | `(schema, values) => Record<string, string>` | Synchronous required-field validator; returns a `fieldName → errorMessage` map |
| `InboxJsonSchema` | interface | Supported subset: `object` with typed properties |
| `InboxFieldSchema` | interface | `type`, `title`, `description`, `enum`, `default`, `items` |
| `SchemaFormProps` | interface | `schema`, `values`, `onChange`, `disabled`, `errors`, `agent_context` |
| `AgentContext` | interface | `{ reasoning, intended_tool, intended_tool_args }` |

## Field types rendered

| Schema type | EUI control |
|---|---|
| `string` (no `enum`) | `EuiFieldText` |
| `number` | `EuiFieldNumber` |
| `boolean` | `EuiSwitch` |
| `string` + `enum` | `EuiSelect` |
| `array` + `items.enum` | `EuiComboBox` (multi-select) |

## Further reading

The HITL architecture — concurrency safety, the CAS state machine, stale-resume handling, rendering order guarantees, and the full component hierarchy — is documented in the [HITL deep-dive](/x-pack/platform/packages/shared/workflows/hitl-common/README.md), specifically the [`@kbn/workflows-hitl-form` package section](/x-pack/platform/packages/shared/workflows/hitl-common/README.md#kbnworkflows-hitl-form).
