import React from 'react';
import type { CasePostRequest, ObservablePost } from '../../../../common/types/api';
import type { CaseUI } from '../../../../common/ui/types';
import type { UseCreateAttachments } from '../../../containers/use_create_attachments';
import type { CaseAttachmentsWithoutOwner } from '../../../types';
export interface CreateCaseFlyoutProps {
    afterCaseCreated?: (theCase: CaseUI, createAttachments: UseCreateAttachments['mutate']) => Promise<void>;
    onClose?: () => void;
    onSuccess?: (theCase: CaseUI) => void;
    attachments?: CaseAttachmentsWithoutOwner;
    headerContent?: React.ReactNode;
    initialValue?: Pick<CasePostRequest, 'title' | 'description'>;
    observables?: ObservablePost[];
}
export declare const CreateCaseFlyout: React.NamedExoticComponent<CreateCaseFlyoutProps>;
