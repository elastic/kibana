import React from 'react';
import { type EuiFlexGroupProps } from '@elastic/eui';
import type { Attachment, AttachmentVersionRef, AttachmentRefActor, VersionedAttachment } from '@kbn/agent-builder-common/attachments';
export interface RoundAttachmentReferencesProps {
    attachmentRefs?: AttachmentVersionRef[];
    conversationAttachments?: VersionedAttachment[];
    fallbackAttachments?: Attachment[];
    actorFilter?: AttachmentRefActor[];
    justifyContent?: EuiFlexGroupProps['justifyContent'];
}
export declare const RoundAttachmentReferences: React.FC<RoundAttachmentReferencesProps>;
