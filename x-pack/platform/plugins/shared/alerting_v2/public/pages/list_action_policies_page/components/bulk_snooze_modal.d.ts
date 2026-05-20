import React from 'react';
interface BulkSnoozeModalProps {
    count: number;
    onApplySnooze: (snoozedUntil: string) => void;
    onCancel: () => void;
}
export declare const BulkSnoozeModal: ({ count, onApplySnooze, onCancel }: BulkSnoozeModalProps) => React.JSX.Element;
export {};
