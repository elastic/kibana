import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { EmbeddableConversationInputRef, PublicEmbeddableConversationInputProps } from '@kbn/agent-builder-browser';
import type { AgentBuilderInternalService } from '../services';
export interface EmbeddableConversationInputInternalProps extends PublicEmbeddableConversationInputProps {
    services: AgentBuilderInternalService;
    coreStart: CoreStart;
}
export declare const EmbeddableConversationInputInternal: React.ForwardRefExoticComponent<EmbeddableConversationInputInternalProps & React.RefAttributes<EmbeddableConversationInputRef>>;
