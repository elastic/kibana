/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { decodeRouteParam } from '../../../paths';

export const useKiPageRouteParams = () => {
  const { id: aiIndexId = '', kiId: kiIdParam = '' } = useParams<{
    id: string;
    kiId: string;
  }>();
  const kiId = useMemo(() => decodeRouteParam(kiIdParam), [kiIdParam]);
  const location = useLocation();
  const index = useMemo(
    () => new URLSearchParams(location.search).get('index') ?? '',
    [location.search]
  );

  return { aiIndexId, kiId, index };
};
