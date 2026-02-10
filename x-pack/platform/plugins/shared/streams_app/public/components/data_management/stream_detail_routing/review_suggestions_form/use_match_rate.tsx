/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import { useEffect, useMemo } from 'react';
import { useSelector } from '@xstate/react';
import { createActor } from 'xstate';
import { getPercentageFormatter } from '../../../../util/formatters';
import { useTimefilter } from '../../../../hooks/use_timefilter';
import type { PartitionSuggestion } from './use_review_suggestions_form';
import { useKibana } from '../../../../hooks/use_kibana';
import { createDocumentsCountCollectorActor } from '../state_management/stream_routing_state_machine/routing_samples_state_machine';

const percentageFormatter = getPercentageFormatter({ precision: 2 });

export const useMatchRate = (
  definition: Streams.WiredStream.GetResponse,
  partition: PartitionSuggestion
) => {
  const { data } = useKibana().dependencies.start;
  const { timeState } = useTimefilter();

  // Re-use logic from the machine definition to retrieve the match rate for the partitions
  const actorInstance = useMemo(
    () => {
      const actor = createActor(createDocumentsCountCollectorActor({ data }), {
        input: {
          condition: partition.condition,
          definition,
          documentMatchFilter: 'matched',
        },
      });
      actor.start();
      return actor;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, partition.condition, definition, timeState.start, timeState.end] // Actor restarts when these change
  );

  useEffect(() => {
    return () => {
      actorInstance.stop();
    };
  }, [actorInstance]);

  const value = useSelector(actorInstance, (snapshot) =>
    snapshot.status === 'done' ? percentageFormatter.format(snapshot.context ?? 0) : undefined
  );
  const loading = useSelector(actorInstance, (snapshot) => snapshot.status === 'active');

  return { value, loading };
};
