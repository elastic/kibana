/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { useTrackPageview } from '../../../hooks/use_track_metric';

export const AnalysisResultsContent = () => {
  useTrackPageview({ app: 'infra_logs', path: 'analysis_results' });
  useTrackPageview({ app: 'infra_logs', path: 'analysis_results', delay: 15000 });

  return <div>Results</div>;
};
