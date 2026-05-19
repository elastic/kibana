import React from 'react';
import type { Feedback } from '../buttons/feedback_buttons';
export declare function ChatItemControls({ error, loading, canRegenerate, canGiveFeedback, onFeedbackClick, onRegenerateClick, onStopGeneratingClick, }: {
    error: any;
    loading: boolean;
    canRegenerate: boolean;
    canGiveFeedback: boolean;
    onFeedbackClick: (feedback: Feedback) => void;
    onRegenerateClick: () => void;
    onStopGeneratingClick: () => void;
}): React.JSX.Element | null;
