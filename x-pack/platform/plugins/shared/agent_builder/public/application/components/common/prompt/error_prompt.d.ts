import React from 'react';
import { type PromptLayoutVariant } from './layout';
export type ErrorPromptType = 'GENERIC_ERROR' | 'CONVERSATION_NOT_FOUND' | 'MISSING_PRIVILEGES' | 'UPGRADE_LICENSE' | 'ADD_LLM_CONNECTION';
interface ErrorPromptProps {
    errorType: ErrorPromptType;
    imageSrc?: string;
    primaryButton: React.ReactNode;
    secondaryButton?: React.ReactNode;
    variant?: PromptLayoutVariant;
}
export declare const ErrorPrompt: React.FC<ErrorPromptProps>;
export {};
