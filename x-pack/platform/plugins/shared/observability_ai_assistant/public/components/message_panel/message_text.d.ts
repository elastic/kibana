import React from 'react';
import type { ChatActionClickHandler } from '../chat/types';
interface Props {
    content: string;
    loading: boolean;
    onActionClick: ChatActionClickHandler;
    anonymizedHighlightedContent?: React.ReactNode;
}
export declare function MessageText({ loading, content, onActionClick, anonymizedHighlightedContent, }: Props): React.JSX.Element;
export {};
