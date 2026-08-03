import React from 'react';
import type { AuthorizationPromptDefinition } from '@kbn/agent-builder-common/agents';
export interface AuthorizationPromptProps {
    prompt: AuthorizationPromptDefinition;
    onAuthorize: () => void;
    onCancel: () => void;
    isLoading?: boolean;
    isDisabled?: boolean;
    isAnswered?: boolean;
    answeredValue?: boolean;
}
export declare const AuthorizationPrompt: ({ prompt, onAuthorize, onCancel, isLoading, isDisabled, isAnswered, answeredValue, }: AuthorizationPromptProps) => React.JSX.Element;
