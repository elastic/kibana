import type { CaseConnectorWithoutName } from '../../../../common/types/domain_zod/connector/v1';
import type { TemplateSettings } from '../../../../common/types/domain/template/v1';
/**
 * The `.none` connector block. `connector` is an always-present block in the template YAML, so a
 * template with no default connector is written as this explicit `.none` shape rather than omitting
 * the key. `normalizeTemplateConnector` collapses it back to `undefined` for the Settings form and
 * for unsaved-change detection.
 */
export declare const NONE_TEMPLATE_CONNECTOR: CaseConnectorWithoutName;
/** Both settings keys, defaulting to `false` — the always-present `settings` block shape. */
export declare const getExplicitTemplateSettings: (settings?: TemplateSettings) => TemplateSettings;
export interface TemplateSettingsAndConnector {
    connector?: CaseConnectorWithoutName;
    settings?: TemplateSettings;
}
/**
 * Reads validated `connector` / `settings` blocks from a full template definition YAML.
 * Invalid or malformed shapes are safely treated as `undefined`.
 */
export declare const getTemplateSettingsAndConnectorFromYaml: (yaml: string) => TemplateSettingsAndConnector;
/**
 * Canonical "no meaningful settings" form. Drops undefined keys and collapses an empty object to
 * `undefined`, so the form's transient shapes (`{}`, `{ syncAlerts: undefined }`) compare equal to
 * an unset value. Used for both persistence and unsaved-change detection.
 */
export declare const normalizeTemplateSettings: (settings?: TemplateSettings) => TemplateSettings | undefined;
/**
 * Canonical "no connector" form: the `.none` (or absent) connector collapses to `undefined`, so the
 * connector form's "no connector" shape (`{ type: 'none', id: 'none', fields: null }`) compares
 * equal to an unset value. Used for both persistence and unsaved-change detection.
 */
export declare const normalizeTemplateConnector: (connector?: CaseConnectorWithoutName) => CaseConnectorWithoutName | undefined;
/**
 * Removes the renderer-managed `connector` and `settings` blocks from a definition YAML, leaving the
 * "case blueprint" (case defaults + `fields`) that the Fields tab edits two-way. Under Option 2 the
 * connector and settings live as panel state (never in the editor buffer); they are lifted out on
 * load and merged back in on save (see mergeTemplateDefinition). Preserves the author's formatting
 * and comments for everything else.
 */
export declare const stripTemplateConfigBlocks: (definitionYaml: string) => string;
/**
 * Composes the COMPLETE persisted definition from the edited blueprint YAML plus the panel-owned
 * `settings` and `connector`. Called once at save time (never per keystroke). `settings` is written
 * explicitly with both keys so the stored definition is complete; the `.none` connector is omitted
 * (it is the implicit default, matching the v1→v2 migration output), and any stale connector block
 * is removed when there is no real connector.
 */
export declare const mergeTemplateDefinition: (fieldsYaml: string, { connector, settings }: TemplateSettingsAndConnector) => string;
