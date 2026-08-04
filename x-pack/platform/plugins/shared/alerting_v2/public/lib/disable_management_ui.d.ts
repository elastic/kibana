import type { ManagementSection } from '@kbn/management-plugin/public';
/**
 * Hides the alerting v2 management UI when the engine is disabled.
 *
 * Disables the registered section and every app underneath it so the
 * `V2 Alerting Preview` entry — together with its `Rules`, `Alerts`,
 * `Action Policies`, and `Execution history` items — is filtered out of
 * the management navigation by `ManagementSectionsService.getSectionsEnabled`.
 */
export declare const disableAlertingManagementUi: (section: ManagementSection) => void;
