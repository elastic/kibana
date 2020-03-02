/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';

import { DEFAULT_REFRESH_INTERVAL_MS } from '../../../../../../common/constants';

import { useRefreshTransformList } from '../../../../common';

export const useRefreshInterval = (
  setBlockRefresh: React.Dispatch<React.SetStateAction<boolean>>
) => {
  const { refresh } = useRefreshTransformList();
  useEffect(() => {
    const interval = setInterval(refresh, DEFAULT_REFRESH_INTERVAL_MS);

    // useEffect cleanup
    return () => {
      clearInterval(interval);
    };
    // custom comparison
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // [] as comparator makes sure this only runs once
};
