import { type Owner } from '../../../common/constants/types';
export declare const getMarkdownEditorStorageKey: ({ caseId, commentId, appId, }: {
    caseId: string;
    commentId: string;
    appId?: string;
}) => string;
export declare const isOwner: (o: string) => o is Owner;
