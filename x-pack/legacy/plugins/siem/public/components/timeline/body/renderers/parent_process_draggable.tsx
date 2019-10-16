/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';

import { DraggableBadge } from '../../../draggables';

import {
  isNillEmptyOrNotFinite,
  isProcessStoppedOrTerminationEvent,
  TokensFlexItem,
} from './helpers';

interface Props {
  contextId: string;
  endgameParentProcessName: string | null | undefined;
  eventAction: string | null | undefined;
  eventId: string;
  processPpid: number | undefined | null;
  text: string | null | undefined;
}

export const ParentProcessDraggable = React.memo<Props>(
  ({ contextId, endgameParentProcessName, eventAction, eventId, processPpid, text }) => {
    if (
      (isNillEmptyOrNotFinite(endgameParentProcessName) && isNillEmptyOrNotFinite(processPpid)) ||
      isProcessStoppedOrTerminationEvent(eventAction)
    ) {
      return null;
    }

    return (
      <>
        {!isNillEmptyOrNotFinite(text) && (
          <TokensFlexItem
            data-test-subj="parent-process-draggable-text"
            grow={false}
            component="span"
          >
            {text}
          </TokensFlexItem>
        )}

        {!isNillEmptyOrNotFinite(endgameParentProcessName) && (
          <TokensFlexItem grow={false} component="span">
            <DraggableBadge
              contextId={contextId}
              eventId={eventId}
              field="endgame.parent_process_name"
              value={endgameParentProcessName}
            />
          </TokensFlexItem>
        )}

        {!isNillEmptyOrNotFinite(processPpid) && (
          <TokensFlexItem grow={false} component="span">
            <DraggableBadge
              contextId={contextId}
              eventId={eventId}
              field="process.ppid"
              queryValue={String(processPpid)}
              value={`(${String(processPpid)})`}
            />
          </TokensFlexItem>
        )}
      </>
    );
  }
);

ParentProcessDraggable.displayName = 'ParentProcessDraggable';
