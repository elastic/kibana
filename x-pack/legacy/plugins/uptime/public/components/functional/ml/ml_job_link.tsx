/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { MLLink } from './ml_link';
import { ML_JOB_ID } from '../../../../common/constants';

export const MLJobLink: React.FC = ({ children }) => {
  const query = {
    ml: { jobIds: [ML_JOB_ID] },
    refreshInterval: { pause: true, value: 0 },
    time: { from: 'now-24h', to: 'now' },
  };

  return <MLLink children={children} query={query} path="/timeseriesexplorer" />;
};
