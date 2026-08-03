import React from 'react';
import type { AskUserQuestionItem, AskUserQuestionAnswer } from '@kbn/agent-builder-common/agents';
interface QuestionAnswerListProps {
    questions: AskUserQuestionItem[];
    answers: AskUserQuestionAnswer[];
}
export declare const QuestionAnswerList: React.FC<QuestionAnswerListProps>;
export {};
