import type { monaco } from '@kbn/monaco';
import type { TemplatesFindRequest } from '../../../common/types/api/template/v1';
import { CaseSeverity } from '../../../common/types/domain';
/**
 * Severity shown in the case-defaults form when a template does not specify one. Mirrors the
 * case-create default (`create.ts` uses `CaseSeverity.LOW`) so the editor fallback can't drift.
 */
export declare const DEFAULT_CASE_SEVERITY = CaseSeverity.LOW;
export declare const PAGE_SIZE_OPTIONS: number[];
export declare const TEMPLATES_STATE_URL_KEY = "templates";
export declare const SORT_ORDER_VALUES: Array<'asc' | 'desc'>;
export declare const DEFAULT_QUERY_PARAMS: TemplatesFindRequest;
export declare const LINE_CLAMP = 3;
/**
 * `perPage` used by the sidebar/header template selectors, which need the full list of
 * enabled templates to populate a combo box rather than a paginated table.
 */
export declare const TEMPLATE_SELECTOR_PAGE_SIZE = 10000;
export declare const MAX_TEMPLATES_PER_FILE = 100;
export declare const MAX_TOTAL_IMPORT_TEMPLATES = 100;
export declare const TEMPLATE_PREVIEW_WIDTH_KEY = "CASES_TEMPLATE_PREVIEW_WIDTH";
export declare const MIN_PREVIEW_WIDTH = 250;
export declare const MIN_EDITOR_WIDTH = 400;
/**
 * Root keys that must always be present in the editor "blueprint" YAML. Only the structural
 * `fields` block is required — every case default (name/description/severity/category/tags/
 * assignees) is optional, so an author can remove any of them without a validation error. The one
 * required piece of template identity is the template *name*, which lives on the saved-object
 * attributes (edited in "Template details"), not in this YAML. `settings`/`connector` are likewise
 * excluded — they are panel-owned (edited on the Configuration tab, merged into the definition on
 * save) and never part of the editor buffer. This single list drives both the completeness check
 * (validate_template_definition) and the Monaco `required` hint (template_json_schema), so the two
 * never drift.
 */
export declare const REQUIRED_TEMPLATE_ROOT_KEYS: readonly ["fields"];
export declare const YAML_EDITOR_OPTIONS: monaco.editor.IStandaloneEditorConstructionOptions;
