export type { PreviewResult as RulePreviewResult, PreviewColumn } from './use_preview';
/**
 * Rule preview hook.
 *
 * Watches the evaluation base query and delegates to the generic `usePreview`
 * hook for ES|QL execution, debouncing, and result mapping.
 */
export declare const useRulePreview: () => import("./use_preview").PreviewResult;
