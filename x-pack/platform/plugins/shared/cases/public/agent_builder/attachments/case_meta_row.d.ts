import React from 'react';
import type { CaseAttachmentData } from '../../../common/types/agent_builder/attachment_schemas';
import type { getCaseUrls } from './route_helpers';
interface Props {
    data: CaseAttachmentData;
    caseUrls: ReturnType<typeof getCaseUrls>;
}
export declare const CaseMetaRow: React.FC<Props>;
export {};
