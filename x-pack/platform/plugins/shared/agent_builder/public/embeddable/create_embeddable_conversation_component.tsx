/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { AgentBuilderInternalService } from '../services';
import { EmbeddableConversationInternal } from './embeddable_conversation';
import type { EmbeddableConversationProps } from './types';

interface CreateEmbeddableConversationComponentOptions {
  services: AgentBuilderInternalService;
  coreStart: CoreStart;
}

/**
 * Creates a React component bound with Agent Builder services.
 * This component can be embedded in other plugins' UIs.
 */
export function createEmbeddableConversationComponent({
  services,
  coreStart,
}: CreateEmbeddableConversationComponentOptions): React.ComponentType<EmbeddableConversationProps> {
  return (props: EmbeddableConversationProps) => {
    // For input-only mode, we don't need flyout props
    if (props.renderMode === 'input-only') {
      return (
        <EmbeddableConversationInternal
          {...props}
          services={services}
          coreStart={coreStart}
          onClose={() => {}}
          ariaLabelledBy=""
        />
      );
    }

    // For full mode, the component should be used inside a flyout
    // which provides onClose and ariaLabelledBy
    throw new Error(
      'Full conversation mode is not supported via getEmbeddableConversationComponent. ' +
        'Use openConversationFlyout() instead for full conversations with history.'
    );
  };
}
