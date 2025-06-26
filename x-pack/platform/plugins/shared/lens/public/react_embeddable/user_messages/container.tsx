/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { UserMessage } from '../../types';
import { VisualizationErrorPanel } from './error_panel';
import { EmbeddableFeatureBadge } from './info_badges';
import { MessagesPopover } from './message_popover';

export function UserMessages({
  blockingErrors,
  warningOrErrors,
  infoMessages,
  canEdit,
}: {
  canEdit: boolean;
  blockingErrors: UserMessage[];
  warningOrErrors: UserMessage[];
  infoMessages: UserMessage[];
}) {
  if (!blockingErrors.length && !warningOrErrors.length && !infoMessages.length) {
    return null;
  }
  return (
    <>
      <VisualizationErrorPanel errors={blockingErrors} canEdit={canEdit} />
      <div
        css={{
          position: 'absolute',
          zIndex: 2,
          left: 0,
          bottom: 0,
        }}
      >
        <MessagesPopover messages={warningOrErrors} />
        <EmbeddableFeatureBadge messages={infoMessages} />
      </div>
    </>
  );
}
