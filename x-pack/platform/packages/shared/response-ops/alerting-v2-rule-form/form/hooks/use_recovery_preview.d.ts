import type { PreviewResult } from './use_preview';
export type { PreviewResult as RecoveryPreviewResult } from './use_preview';
/**
 * Recovery preview hook.
 *
 * Watches the recovery policy form fields and uses the standalone
 * `recoveryPolicy.query.base` as the recovery query.
 *
 * Delegates to `usePreview` for ES|QL execution and result mapping.
 * Disabled when recovery type is not `'query'`.
 */
export declare const useRecoveryPreview: () => PreviewResult;
