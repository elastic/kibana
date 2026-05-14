/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon } from '@elastic/eui';
import { createPublicStepDefinition } from '@kbn/workflows-extensions/public';
import { getResultsStepCommonDefinition } from '../../../common/workflows/steps/get_results_step';

const OsqueryIcon: React.FC = () => React.createElement(EuiIcon, { type: 'logoOsquery' });

export const getResultsStepPublicDefinition = createPublicStepDefinition({
  ...getResultsStepCommonDefinition,
  icon: OsqueryIcon,
});
