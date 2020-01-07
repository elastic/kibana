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
  endgameParentProcessName: string | null | undefined;
  eventId: string;
  processPpid: number | undefined | null;
  text: string | null | undefined;
}

export const ParentProcessDraggable = React.memo<Props>(
  ({ contextId, endgameParentProcessName, eventId, processPpid, text }) => {
    if (isNillEmptyOrNotFinite(endgameParentProcessName) && isNillEmptyOrNotFinite(processPpid)) {
      return null;
    }

    return (
      <>
        {!isNillEmptyOrNotFinite(text) && (
          <TokensFlexItem
            component="span"
            data-test-subj="parent-process-draggable-text"
            grow={false}
          >
            {text}
          </TokensFlexItem>
        )}

        {!isNillEmptyOrNotFinite(endgameParentProcessName) && (
          <TokensFlexItem component="span" grow={false}>
            <DraggableBadge
              contextId={contextId}
              eventId={eventId}
              field="endgame.parent_process_name"
              value={endgameParentProcessName}
            />
          </TokensFlexItem>
        )}

        {!isNillEmptyOrNotFinite(processPpid) && (
          <TokensFlexItem component="span" grow={false}>
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
