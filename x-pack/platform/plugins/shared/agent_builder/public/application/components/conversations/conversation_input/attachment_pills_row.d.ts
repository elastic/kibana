import { type EuiFlexGroupProps } from '@elastic/eui';
import React from 'react';
import type { Attachment, AttachmentInput } from '@kbn/agent-builder-common/attachments';
export interface AttachmentPillsRowProps {
    attachments: AttachmentInput[] | Attachment[];
    removable?: boolean;
    justifyContent?: EuiFlexGroupProps['justifyContent'];
}
export declare const AttachmentPillsRow: React.FC<AttachmentPillsRowProps>;
