/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorSwimlaneTypeFields } from '../../../common/types/domain';
import type { Format } from './types';

export const format: Format = (theCase) => {
  const { caseId = theCase.id } =
    (theCase.connector.fields as ConnectorSwimlaneTypeFields['fields']) ?? {};
  return { caseId };
};
