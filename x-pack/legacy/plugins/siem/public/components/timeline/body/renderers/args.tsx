/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';

import { DraggableBadge } from '../../../draggables';
import { isNillEmptyOrNotFinite, TokensFlexItem } from './helpers';

interface Props {
  args: string[] | null | undefined;
  contextId: string;
  eventId: string;
  processTitle: string | null | undefined;
}

export const Args = React.memo<Props>(({ args, contextId, eventId, processTitle }) => {
  if (isNillEmptyOrNotFinite(args) && isNillEmptyOrNotFinite(processTitle)) {
    return null;
  }

  return (
    <>
      {args != null &&
        args.map((arg, i) => (
          <TokensFlexItem key={`${contextId}-args-${i}-${arg}`} grow={false} component="span">
            <DraggableBadge
              contextId={`${contextId}-args-${i}-${arg}`}
              eventId={eventId}
              field="process.args"
              value={arg}
            />
          </TokensFlexItem>
        ))}

      {!isNillEmptyOrNotFinite(processTitle) && (
        <TokensFlexItem grow={false} component="span">
          <DraggableBadge
            contextId={contextId}
            eventId={eventId}
            field="process.title"
            value={processTitle}
          />
        </TokensFlexItem>
      )}
    </>
  );
});

Args.displayName = 'Args';
