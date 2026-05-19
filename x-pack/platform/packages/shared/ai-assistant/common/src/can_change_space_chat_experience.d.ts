import type { Capabilities } from '@kbn/core-capabilities-common';
/**
 * Returns true when the user can persist the preferred chat experience UI setting
 * for the space (same conditions as showing an editable chat experience control
 * on Gen AI Settings).
 */
export declare function canUserChangeSpaceChatExperience(capabilities: Capabilities): boolean;
