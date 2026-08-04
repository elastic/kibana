import { type EuiFlexGroupProps } from '@elastic/eui';
import React from 'react';
import type { ConversationAttachment } from '@kbn/agent-builder-common/attachments';
export interface AttachmentPillsRowProps {
    attachments: ConversationAttachment[];
    removable?: boolean;
    justifyContent?: EuiFlexGroupProps['justifyContent'];
}
export declare const AttachmentPillsRow: React.FC<AttachmentPillsRowProps>;
