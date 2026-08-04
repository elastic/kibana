import type { estypes } from '@elastic/elasticsearch';
import type { AttackDiscoveryAlertDocument } from '../../../schedules/types';
/**
 * Returns array of missing field names for debugging.
 *
 * Note: ALERT_ATTACK_DISCOVERY_ALERTS_CONTEXT_COUNT is not checked because:
 * - It's not present in workflow-generated discoveries
 * - It's only used for display/informational purposes, not required for functionality
 */
export declare const getMissingFields: (hit: estypes.SearchHit<AttackDiscoveryAlertDocument>) => string[];
/**
 * Returns `true` if the document is missing fields required to create an `AttackDiscoveryAlert`.
 *
 * Note: ALERT_ATTACK_DISCOVERY_ALERTS_CONTEXT_COUNT is not checked because:
 * - It's not present in workflow-generated discoveries
 * - It's only used for display/informational purposes, not required for functionality
 */
export declare const isMissingRequiredFields: (hit: estypes.SearchHit<AttackDiscoveryAlertDocument>) => boolean;
