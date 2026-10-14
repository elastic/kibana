/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useQuery } from '@kbn/react-query';
import { KbnWarningCallout } from '@kbn/ui-callout';
import React from 'react';
import type { SpaceBudgetStatusResponse } from '../../../common/budgets';
import { getSpaceBudgetStatus } from '../api/budgets';
import { contextEngineQueryKeys } from '../hooks/query_keys';
import { useKibana } from '../hooks/use_kibana';
import { formatResetDate } from '../utils/budgets';

const BUDGET_STALE_TIME_MS = 60_000;

/** Lists the AI indices whose AI work is paused by a spent budget, on the landing page. */
export const SpaceBudgetCallout = () => {
  const {
    services: { http },
  } = useKibana();
  const { data } = useQuery<SpaceBudgetStatusResponse, Error>({
    queryKey: contextEngineQueryKeys.budgets.space(),
    queryFn: ({ signal }) => getSpaceBudgetStatus(http, { signal }),
    staleTime: BUDGET_STALE_TIME_MS,
  });

  if (!data) {
    return null;
  }

  const resetDate = formatResetDate(data.period.end);
  const isSpacePaused =
    data.space.automations.state === 'exhausted' || data.space.suggestions.state === 'exhausted';
  const pausedIndices = data.ai_indices
    .filter(
      ({ buckets }) =>
        buckets.automations.state === 'exhausted' || buckets.suggestions.state === 'exhausted'
    )
    .map(({ id }) => id);

  if (!isSpacePaused && pausedIndices.length === 0) {
    return null;
  }

  return (
    <>
      <KbnWarningCallout
        size="s"
        title={
          isSpacePaused
            ? i18n.translate('xpack.contextEngine.landing.budget.spacePaused', {
                defaultMessage:
                  'The monthly AI budget of this space is spent. Paused AI work resumes on {resetDate}.',
                values: { resetDate },
              })
            : i18n.translate('xpack.contextEngine.landing.budget.indicesPaused', {
                defaultMessage:
                  'AI work is paused until {resetDate} for {count, plural, one {AI index} other {AI indices}} {names}, whose monthly budget is spent.',
                values: { resetDate, count: pausedIndices.length, names: pausedIndices.join(', ') },
              })
        }
        data-test-subj="contextSpaceBudgetCallout"
      />
      <EuiSpacer size="m" />
    </>
  );
};
