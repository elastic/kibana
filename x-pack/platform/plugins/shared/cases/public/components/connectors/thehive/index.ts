/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';

import type { CaseConnector } from '../types';
import type { TheHiveFieldsType } from '../../../../common/types/domain';
import { ConnectorTypes } from '../../../../common/types/domain';

export * from './types';

export const getCaseConnector = (): CaseConnector<TheHiveFieldsType> => ({
  id: ConnectorTypes.theHive,
  fieldsComponent: lazy(() => import('./case_fields')),
  previewComponent: lazy(() => import('./case_fields_preview')),
});
