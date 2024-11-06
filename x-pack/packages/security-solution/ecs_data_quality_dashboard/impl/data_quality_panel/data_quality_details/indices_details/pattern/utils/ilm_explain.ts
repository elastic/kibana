/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IlmExplainLifecycleLifecycleExplain } from '@elastic/elasticsearch/lib/api/types';

import { IlmExplainPhaseCounts, IlmPhase } from '../../../../types';

export const isManaged = (
  ilmExplainRecord: IlmExplainLifecycleLifecycleExplain | undefined
): boolean => ilmExplainRecord?.managed === true;

export const getPhaseCount = ({
  ilmExplain,
  ilmPhase,
  indexName,
}: {
  ilmExplain: Record<string, IlmExplainLifecycleLifecycleExplain> | null;
  ilmPhase: IlmPhase;
  indexName: string;
}): number => {
  const ilmExplainRecord = ilmExplain != null ? ilmExplain[indexName] : undefined;

  if (ilmPhase === 'unmanaged') {
    return isManaged(ilmExplainRecord) ? 0 : 1;
  } else if (ilmExplainRecord != null && 'phase' in ilmExplainRecord) {
    return ilmExplainRecord.phase === ilmPhase ? 1 : 0;
  }

  return 0;
};

export const getIlmExplainPhaseCounts = (
  ilmExplain: Record<string, IlmExplainLifecycleLifecycleExplain> | null
): IlmExplainPhaseCounts => {
  const indexNames = ilmExplain != null ? Object.keys(ilmExplain) : [];

  return indexNames.reduce<IlmExplainPhaseCounts>(
    (acc, indexName) => ({
      hot:
        acc.hot +
        getPhaseCount({
          ilmExplain,
          ilmPhase: 'hot',
          indexName,
        }),
      warm:
        acc.warm +
        getPhaseCount({
          ilmExplain,
          ilmPhase: 'warm',
          indexName,
        }),
      cold:
        acc.cold +
        getPhaseCount({
          ilmExplain,
          ilmPhase: 'cold',
          indexName,
        }),
      frozen:
        acc.frozen +
        getPhaseCount({
          ilmExplain,
          ilmPhase: 'frozen',
          indexName,
        }),
      unmanaged:
        acc.unmanaged +
        getPhaseCount({
          ilmExplain,
          ilmPhase: 'unmanaged',
          indexName,
        }),
    }),
    {
      hot: 0,
      warm: 0,
      cold: 0,
      frozen: 0,
      unmanaged: 0,
    }
  );
};
