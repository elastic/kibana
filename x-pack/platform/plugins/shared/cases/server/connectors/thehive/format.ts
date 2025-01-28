/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Format } from './types';
import type { ConnectorTheHiveTypeFields } from '../../../common/types/domain';

function mapSeverity(severity: string): number {
  switch (severity) {
    case 'low':
      return 1;
    case 'medium':
      return 2;
    case 'high':
      return 3;
    case 'critical':
      return 4;
    default:
      return 2;
  }
}

export const format: Format = (theCase) => {
  const { tlp = null } = (theCase.connector.fields as ConnectorTheHiveTypeFields['fields']) ?? {};
  return {
    tags: theCase.tags,
    tlp,
    severity: mapSeverity(theCase.severity),
  };
};
