/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import useObservable from 'react-use/lib/useObservable';
import type { SidebarComponentProps } from '@kbn/core-chrome-sidebar';
import { createEmbeddableConversation } from '../embeddable/create_embeddable_conversation';
import { sidebarServices$, sidebarRuntimeContext$ } from './sidebar_context';

const sidebarBodyStyles = css`
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  min-height: 0;
  overflow: hidden;
`;

export function SidebarConversation({ onClose }: SidebarComponentProps): React.ReactElement | null {
  const services = useObservable(sidebarServices$);
  const runtimeContext = useObservable(sidebarRuntimeContext$);

  const ConversationComponent = useMemo(
    () =>
      services
        ? createEmbeddableConversation({
            services: services.services,
            coreStart: services.coreStart,
          })
        : null,
    [services]
  );

  if (!services || !runtimeContext || !ConversationComponent) {
    return null;
  }

  const { options, onRegisterCallbacks, onClose: contextOnClose } = runtimeContext;
  const { onClose: externalOnClose, ...restOptions } = options;

  const handleOnClose = () => {
    onClose(); // closes the sidebar panel
    externalOnClose?.(); // calls the consumer's optionally defined onClose callback
    contextOnClose?.(); // clears up internal implementation in plugin and context
  };

  return (
    <div css={sidebarBodyStyles}>
      <ConversationComponent
        onClose={handleOnClose}
        ariaLabelledBy="agent-builder-sidebar"
        onRegisterCallbacks={onRegisterCallbacks}
        {...restOptions}
      />
    </div>
  );
}
