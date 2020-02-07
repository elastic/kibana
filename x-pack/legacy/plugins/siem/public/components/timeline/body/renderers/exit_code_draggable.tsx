/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { DraggableBadge } from '../../../draggables';

import { isNillEmptyOrNotFinite, TokensFlexItem } from './helpers';

interface Props {
  contextId: string;
  endgameExitCode: string | null | undefined;
  eventId: string;
  text: string | null | undefined;
}

export const ExitCodeDraggable = React.memo<Props>(
  ({ contextId, endgameExitCode, eventId, text }) => {
    if (isNillEmptyOrNotFinite(endgameExitCode)) {
      return null;
    }

    return (
      <>
        {!isNillEmptyOrNotFinite(text) && (
          <TokensFlexItem data-test-subj="exit-code-draggable-text" grow={false} component="span">
            {text}
          </TokensFlexItem>
        )}

        <TokensFlexItem grow={false} component="span">
          <DraggableBadge
            contextId={contextId}
            eventId={eventId}
            field="endgame.exit_code"
            value={endgameExitCode}
          />
        </TokensFlexItem>
      </>
    );
  }
);

ExitCodeDraggable.displayName = 'ExitCodeDraggable';
