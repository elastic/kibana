/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';

// import { SectionError, SectionLoading } from '../../../components';
import { UIM_RECOVERY_LIST_LOAD } from '../../../constants';
// import { useLoadSnapshots } from '../../../services/http';
import { uiMetricService } from '../../../services/ui_metric';

export const RecoveryList: React.FunctionComponent = () => {
  // Track component loaded
  const { trackUiMetric } = uiMetricService;
  useEffect(() => {
    trackUiMetric(UIM_RECOVERY_LIST_LOAD);
  }, []);

  return <span>Recovery list</span>;
};
