/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IlmExplainLifecycleLifecycleExplain } from '@elastic/elasticsearch/lib/api/types';
import { IlmPhase } from '../types';

export const getIlmPhase = (
  ilmExplainRecord: IlmExplainLifecycleLifecycleExplain | undefined,
  isILMAvailable: boolean
): IlmPhase | undefined => {
  if (ilmExplainRecord == null || !isILMAvailable) {
    return undefined;
  }

  if ('phase' in ilmExplainRecord) {
    const phase = ilmExplainRecord.phase;

    switch (phase) {
      case 'hot':
        return 'hot';
      case 'warm':
        return 'warm';
      case 'cold':
        return 'cold';
      case 'frozen':
        return 'frozen';
      default:
        return undefined;
    }
  } else {
    return 'unmanaged';
  }
};
