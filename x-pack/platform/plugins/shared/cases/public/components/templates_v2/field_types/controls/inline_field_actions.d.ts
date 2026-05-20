import type { FC } from 'react';
interface InlineFieldActionsProps {
    name: string;
    onConfirm: () => void;
    onCancel: () => void;
}
export declare const InlineFieldActions: FC<InlineFieldActionsProps>;
export {};
