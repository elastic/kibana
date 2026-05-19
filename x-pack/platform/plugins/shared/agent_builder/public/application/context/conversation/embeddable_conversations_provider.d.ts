import React from 'react';
import type { EmbeddableConversationInternalProps } from '../../../embeddable/types';
interface EmbeddableConversationsProviderProps extends EmbeddableConversationInternalProps {
    children: React.ReactNode;
}
export declare const EmbeddableConversationsProvider: React.FC<EmbeddableConversationsProviderProps>;
export {};
