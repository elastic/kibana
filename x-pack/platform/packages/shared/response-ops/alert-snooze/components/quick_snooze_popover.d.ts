import React from 'react';
export interface QuickSnoozePopoverProps {
    onApplySnooze: (schedule: string | null) => void;
    'data-test-subj'?: string;
}
export declare const QuickSnoozePopover: ({ onApplySnooze, "data-test-subj": dataTestSubj, }: QuickSnoozePopoverProps) => React.JSX.Element;
