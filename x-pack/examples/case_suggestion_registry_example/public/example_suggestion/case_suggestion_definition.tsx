/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { CaseSuggestionDefinitionPublic } from '@kbn/case-suggestion-registry-plugin/public';
import { SyntheticsMonitorContext } from '../../common/types';

export const syntheticsMonitorContextDefinition: CaseSuggestionDefinitionPublic<SyntheticsMonitorContext> =
  {
    key: 'example',
    owner: 'observability',
    children: React.lazy(() => import('./case_suggestion_children')),
  };
