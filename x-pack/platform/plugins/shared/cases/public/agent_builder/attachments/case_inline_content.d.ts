import React from 'react';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { AttachmentRenderProps } from '@kbn/agent-builder-browser/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { CASE_ATTACHMENT_TYPE, CaseAttachmentData } from '../../../common/types/agent_builder/attachment_schemas';
export type CaseAttachment = Attachment<typeof CASE_ATTACHMENT_TYPE, CaseAttachmentData>;
interface Services {
    application: ApplicationStart;
}
export declare const createCaseInlineContent: ({ application }: Services) => React.FC<AttachmentRenderProps<CaseAttachment>>;
export {};
