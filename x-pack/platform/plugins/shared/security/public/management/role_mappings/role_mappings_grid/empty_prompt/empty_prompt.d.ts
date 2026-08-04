import React from 'react';
import type { ScopedHistory } from '@kbn/core/public';
interface EmptyPromptProps {
    history: ScopedHistory;
    readOnly?: boolean;
}
export declare const EmptyPrompt: React.FunctionComponent<EmptyPromptProps>;
export {};
