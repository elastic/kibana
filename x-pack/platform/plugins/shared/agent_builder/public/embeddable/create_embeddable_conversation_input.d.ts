import React from 'react';
import type { EmbeddableConversationInputRef, PublicEmbeddableConversationInputProps } from '@kbn/agent-builder-browser';
import type { EmbeddableConversationDependencies } from './types';
/**
 * The returned component is a `forwardRef` so consumers can imperatively push
 * attachments after mount via `EmbeddableConversationInputRef`.
 */
export declare const createEmbeddableConversationInput: ({ services, coreStart, }: EmbeddableConversationDependencies) => React.ForwardRefExoticComponent<PublicEmbeddableConversationInputProps & React.RefAttributes<EmbeddableConversationInputRef>>;
