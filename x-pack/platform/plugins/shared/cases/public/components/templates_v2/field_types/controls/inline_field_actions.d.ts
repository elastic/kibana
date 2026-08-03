import type { FC } from 'react';
interface InlineFieldActionsProps {
    name: string;
    onConfirm: () => void;
    onCancel: () => void;
    isLoading?: boolean;
    isDisabled?: boolean;
}
export declare const InlineFieldActions: FC<InlineFieldActionsProps>;
export {};
