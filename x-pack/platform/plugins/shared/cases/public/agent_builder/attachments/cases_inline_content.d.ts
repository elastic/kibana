import React from 'react';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { AttachmentRenderProps } from '@kbn/agent-builder-browser/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { CASES_ATTACHMENT_TYPE, CasesAttachmentData } from '../../../common/types/agent_builder/attachment_schemas';
export type CasesAttachment = Attachment<typeof CASES_ATTACHMENT_TYPE, CasesAttachmentData>;
interface Services {
    application: ApplicationStart;
}
export declare const createCasesInlineContent: ({ application }: Services) => (props: AttachmentRenderProps<CasesAttachment>) => React.JSX.Element;
export {};
