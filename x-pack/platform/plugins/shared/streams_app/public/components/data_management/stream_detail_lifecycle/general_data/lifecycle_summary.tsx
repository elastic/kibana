/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Streams } from '@kbn/streams-schema';
import { isDslLifecycle, isIlmLifecycle } from '@kbn/streams-schema';
import type { DataStreamStats } from '../hooks/use_data_stream_stats';
import { DataLifecycleSummary } from '../common/data_lifecycle/data_lifecycle_summary';
import { useUpdateStreamLifecycle } from '../hooks/use_update_stream_lifecycle';
import { useIlmLifecycleSummary } from '../hooks/use_ilm_lifecycle_summary';
import { useDslLifecycleSummary } from '../hooks/use_dsl_lifecycle_summary';

interface LifecycleSummaryProps {
  definition: Streams.ingest.all.GetResponse;
  stats?: DataStreamStats;
  refreshDefinition?: () => void;
}

export const LifecycleSummary = ({
  definition,
  stats,
  refreshDefinition,
}: LifecycleSummaryProps) => {
  const isIlm = isIlmLifecycle(definition.effective_lifecycle);
  const isDsl = isDslLifecycle(definition.effective_lifecycle);
  const { updateStreamLifecycle } = useUpdateStreamLifecycle(definition);

  const ilmSummary = useIlmLifecycleSummary({
    definition,
    stats,
    refreshDefinition,
    updateStreamLifecycle,
  });
  const dslSummary = useDslLifecycleSummary({
    definition,
    stats,
  });

  return (
    <>
      <DataLifecycleSummary
        phases={isIlm ? ilmSummary.phases : dslSummary.phases}
        loading={isIlm && ilmSummary.loading}
        downsampleSteps={isDsl ? dslSummary.downsampleSteps : undefined}
        isIlm={isIlm}
        onRemovePhase={isIlm ? ilmSummary.onRemovePhase : undefined}
        onRemoveDownsampleStep={isIlm ? ilmSummary.onRemoveDownsampleStep : undefined}
        canManageLifecycle={definition.privileges.lifecycle}
      />

      {ilmSummary.modals}
    </>
  );
};
