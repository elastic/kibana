import type React from 'react';
import type { AnswerDraft, AskUserQuestionPromptProps } from './ask_user_question_prompt_utils';
export declare const useAskUserQuestionPrompt: ({ promptId, questions, onSubmit, isLoading, isDisabled, }: AskUserQuestionPromptProps) => {
    refs: {
        customInputRef: React.RefObject<HTMLInputElement>;
        confirmButtonRef: React.RefObject<HTMLButtonElement>;
        skipButtonRef: React.RefObject<HTMLButtonElement>;
        customRowRef: React.RefObject<HTMLDivElement>;
        setOptionRef: (index: number) => (el: HTMLDivElement | null) => void;
    };
    question: {
        baseId: string;
        currentQuestion: import("@kbn/agent-builder-common/agents").AskUserQuestionItem;
        currentIndex: number;
        totalQuestions: number;
        currentDraft: AnswerDraft;
        isFinalQuestion: boolean;
        canConfirm: boolean;
        customRowIndex: number;
        questionGroupName: string;
        isCustomActive: boolean;
    };
    ui: {
        showCustomError: boolean;
        isInteractionDisabled: boolean;
        isLoading: boolean;
    };
    handlers: {
        handleOptionPick: (optionIndex: number, checked: boolean) => void;
        handleOptionKeyDown: (event: React.KeyboardEvent, index: number) => void;
        handleCustomChange: (value: string) => void;
        handleCustomToggle: (selected: boolean) => void;
        handleCustomFieldKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
        handleBack: () => void;
        handleSkip: () => void;
        handleConfirm: () => void;
    };
};
