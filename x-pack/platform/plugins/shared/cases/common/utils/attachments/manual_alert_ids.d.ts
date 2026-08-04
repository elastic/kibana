import type { AttachmentUIV2 } from '../../ui/types';
/**
 * Returns the deduped list of alert ids attached to a case across both legacy
 * and unified alert attachments. Used by solution alert tabs to drive the
 * alerts table.
 */
export declare const getManualAlertIds: (attachments: AttachmentUIV2[]) => string[];
