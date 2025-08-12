/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { SuggestionType } from '@kbn/cases-plugin/public';
import { SyntheticsMonitorSuggestion } from '../../common/types';

export const SyntheticsMonitorSuggestionDefinition: SuggestionType<SyntheticsMonitorSuggestion> = {
  id: 'example',
  owner: 'observability',
  children: React.lazy(() => import('./case_suggestion_children')),
};
