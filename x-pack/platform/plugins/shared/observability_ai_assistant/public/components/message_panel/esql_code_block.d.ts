import React from 'react';
import type { ChatActionClickHandler } from '../chat/types';
export declare function CodeBlock({ children }: {
    children: React.ReactNode;
}): React.JSX.Element;
export declare function EsqlCodeBlock({ value, lang, actionsDisabled, onActionClick, }: {
    value: string;
    lang: string;
    actionsDisabled: boolean;
    onActionClick: ChatActionClickHandler;
}): React.JSX.Element;
