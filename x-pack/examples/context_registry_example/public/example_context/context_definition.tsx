/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { ContextDefinitionPublic } from '@kbn/context-registry-plugin/public';
import { SyntheticsMonitorContext } from '../../common/types';

export const syntheticsMonitorContextDefinition: ContextDefinitionPublic<SyntheticsMonitorContext> =
  {
    key: 'example',
    children: React.lazy(() => import('./context_children')),
  };
