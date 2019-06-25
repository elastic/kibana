/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import createContainer from 'constate-latest';
import { useContext, useEffect, useState } from 'react';
import { withLogPosition } from '../../../containers/logs/with_log_position';
import { TimeKey } from '../../../../common/time';

export const useLogHighlightsState = ({}) => {
  const [highlightTerms, setHighlightTerms] = useState<string[]>([]);
  const [targetPosition, setTargetPosition] = useState<TimeKey | null>(null);

  useEffect(
    () => {
      // Terms or position has changed
    },
    [highlightTerms, targetPosition]
  );

  return {
    highlightTerms,
    setHighlightTerms,
    setTargetPosition,
  };
};

export const LogHighlightsState = createContainer(useLogHighlightsState);

// Bridges Redux container state with Hooks state. Once state is moved fully from
// Redux to Hooks this can be removed.
export const LogHighlightsBridge = withLogPosition(
  ({ targetPosition }: { targetPosition: TimeKey | null }) => {
    const { setTargetPosition } = useContext(LogHighlightsState.Context);
    useEffect(
      () => {
        setTargetPosition(targetPosition);
      },
      [targetPosition]
    );

    return null;
  }
);
