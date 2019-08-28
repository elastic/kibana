/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { Source, useSource } from '../../../containers/source';
import { useSourceId } from '../../../containers/source_id';

export const AnalysisPageProviders: React.FunctionComponent = ({ children }) => {
  const [sourceId] = useSourceId();
  const source = useSource({ sourceId });

  return <Source.Context.Provider value={source}>{children}</Source.Context.Provider>;
};
