/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Redirect, useLocation, useParams } from 'react-router-dom';
import {
  KI_INDEX_QUERY_PARAM,
  decodeRouteParam,
  getAiIndexKnowledgeIndicatorsPath,
  getKiDocQueryParams,
} from '../paths';

/** Sends old `/ai_index/:id/ki/:kiId[/document]` links to the Knowledge documents tab. */
export const LegacyKiRedirect = () => {
  const { id = '', kiId = '' } = useParams<{ id: string; kiId: string }>();
  const { search } = useLocation();
  const index = new URLSearchParams(search).get(KI_INDEX_QUERY_PARAM) ?? '';
  const params = new URLSearchParams(getKiDocQueryParams(decodeRouteParam(kiId), index));

  return (
    <Redirect
      to={{ pathname: getAiIndexKnowledgeIndicatorsPath(id), search: `?${params.toString()}` }}
    />
  );
};
