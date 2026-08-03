import { AttachmentActionType } from '../../../../client/attachment_framework/types';
export declare const useLensOpenVisualization: ({ comment }: {
    comment: string;
}) => {
    canUseEditor: boolean;
    actionConfig: null;
} | {
    canUseEditor: boolean;
    actionConfig: {
        type: AttachmentActionType.BUTTON;
        iconType: string;
        label: string;
        onClick: () => void;
    };
};
