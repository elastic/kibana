import type { UseEuiTheme } from '@elastic/eui';
import type { AskUserQuestionAnswer, AskUserQuestionPromptResponse, AskUserQuestionItem } from '@kbn/agent-builder-common/agents';
import { type ReportHitlQuestionAnsweredParams } from '@kbn/agent-builder-common/telemetry';
export { promptContainerStyles as containerStyles } from './prompt_container.styles';
/** In-progress (mutable) answer for a single question, before it is mapped to the wire shape. */
export interface AnswerDraft {
    choice?: number[];
    custom?: string;
    /** True when the user has explicitly selected the custom ("Be more specific") option. */
    customSelected?: boolean;
    skipped?: boolean;
}
export interface AskUserQuestionPromptProps {
    promptId: string;
    questions: AskUserQuestionItem[];
    onSubmit: (response: AskUserQuestionPromptResponse) => void;
    isLoading?: boolean;
    isDisabled?: boolean;
}
export declare const labels: {
    backButton: string;
    skipButton: string;
    confirmButton: string;
    continueButton: string;
    customPlaceholder: string;
    customError: string;
};
export declare const optionCardStyles: ({ euiTheme }: UseEuiTheme) => import("@emotion/utils").SerializedStyles;
export declare const customRowStyles: ({ euiTheme }: UseEuiTheme) => import("@emotion/utils").SerializedStyles;
export declare const draftToAnswer: (draft: AnswerDraft) => AskUserQuestionAnswer;
export declare const isDraftAnswerable: (draft: AnswerDraft) => boolean;
/** Custom option is selected but its text field is empty — must block submit. */
export declare const isCustomTextMissing: (draft: AnswerDraft) => boolean;
export declare const useAskUserQuestionTelemetry: ({ promptId, questions, }: {
    promptId: string;
    questions: AskUserQuestionItem[];
}) => {
    reportPromptShown: () => void;
    reportQuestionAnswered: (index: number, draft: AnswerDraft, outcome: ReportHitlQuestionAnsweredParams["outcome"]) => void;
};
