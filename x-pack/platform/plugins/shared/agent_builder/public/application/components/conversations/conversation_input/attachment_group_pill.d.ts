import React from 'react';
import type { AttachmentGroup } from '@kbn/agent-builder-common/attachments';
export interface AttachmentGroupPillProps {
    group: AttachmentGroup;
    onRemove?: () => void;
}
export declare const AttachmentGroupPill: React.FC<AttachmentGroupPillProps>;
