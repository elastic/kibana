export { VIEW_TOGGLE_LIST_ID, VIEW_TOGGLE_TABLE_ID, type ViewToggleId, } from '../../../../common/constants';
export declare const CUSTOM_FIELD_KEY_PREFIX = "cf_";
export declare const ALL_CASES_STATE_URL_KEY = "cases";
export declare const LEGACY_SUPPORTED_STATE_KEYS: readonly ["status", "severity", "page", "perPage", "sortField", "sortOrder"];
/**
 * Fields rendered directly in every list item (title row + meta row).
 * The Fields popover excludes these so users only toggle optional extras.
 */
export declare const LIST_ALWAYS_VISIBLE_FIELDS: string[];
