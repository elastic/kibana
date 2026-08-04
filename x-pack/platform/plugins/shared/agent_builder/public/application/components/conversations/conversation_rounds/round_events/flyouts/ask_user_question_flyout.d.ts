import React from 'react';
import type { AskUserQuestionItem, AskUserQuestionAnswer } from '@kbn/agent-builder-common/agents';
interface AskUserQuestionFlyoutProps {
    isOpen: boolean;
    onClose: () => void;
    questions: AskUserQuestionItem[];
    answers: AskUserQuestionAnswer[];
}
export declare const AskUserQuestionFlyout: React.FC<AskUserQuestionFlyoutProps>;
export {};
