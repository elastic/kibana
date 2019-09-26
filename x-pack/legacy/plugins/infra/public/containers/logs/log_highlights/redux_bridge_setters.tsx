/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState } from 'react';
import { TimeKey } from '../../../../common/time';

export const useReduxBridgeSetters = () => {
  const [startKey, setStartKey] = useState<TimeKey | null>(null);
  const [endKey, setEndKey] = useState<TimeKey | null>(null);
  const [filterQuery, setFilterQuery] = useState<string | null>(null);
  const [visibleMidpoint, setVisibleMidpoint] = useState<TimeKey | null>(null);
  const [jumpToTarget, setJumpToTarget] = useState<(target: TimeKey) => void>(() => undefined);

  return {
    startKey,
    endKey,
    filterQuery,
    visibleMidpoint,
    setStartKey,
    setEndKey,
    setFilterQuery,
    setVisibleMidpoint,
    jumpToTarget,
    setJumpToTarget,
  };
};
