import React from 'react';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
export interface RoundAttachmentPillProps {
    attachment: VersionedAttachment;
    version: number;
}
export declare const RoundAttachmentPill: React.FC<RoundAttachmentPillProps>;
