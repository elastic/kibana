/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { compact } from 'lodash';
import {
  IlmPolicyDeletePhase,
  IlmPolicyHotPhase,
  IlmPolicyPhase,
  IlmPolicyPhases,
} from '@kbn/streams-schema';
import { rolloverCondition } from './rollover_condition';

export const ILM_PHASES = {
  hot: {
    color: '#F6726A',
    description: (phase: IlmPolicyPhase | IlmPolicyDeletePhase, phases: IlmPolicyPhases) => {
      const hotPhase = phase as IlmPolicyHotPhase;
      const hasNextPhase = Boolean(phases.warm || phases.cold || phases.frozen || phases.delete);
      const condition = rolloverCondition(hotPhase.rollover);
      return compact([
        i18n.translate('xpack.streams.streamDetailLifecycle.hotPhaseDescription', {
          defaultMessage: 'Recent, frequently-searched data. Best indexing and search performance.',
        }),
        hasNextPhase
          ? condition
            ? i18n.translate('xpack.streams.streamDetailLifecycle.hotPhaseRolloverDescription', {
                defaultMessage: '*Time since rollover. Current rollover condition: {condition}.',
                values: { condition },
              })
            : i18n.translate('xpack.streams.streamDetailLifecycle.hotPhaseNoRolloverDescription', {
                defaultMessage:
                  '*Time since rollover. Data will not move to the next phase because rollover is not enabled.',
              })
          : '',
      ]);
    },
  },
  warm: {
    color: '#FCD883',
    description: () => [
      i18n.translate('xpack.streams.streamDetailLifecycle.warmPhaseDescription', {
        defaultMessage:
          'Frequently searched data, rarely updated. Optimized for search, not indexing.',
      }),
    ],
  },
  cold: {
    color: '#A6EDEA',
    description: () => [
      i18n.translate('xpack.streams.streamDetailLifecycle.coldPhaseDescription', {
        defaultMessage:
          'Data searched infrequently, not updated. Optimized for cost savings over search performance.',
      }),
    ],
  },
  frozen: {
    color: '#61A2FF',
    description: () => [
      i18n.translate('xpack.streams.streamDetailLifecycle.frozenPhaseDescription', {
        defaultMessage:
          'Most cost-effective way to store your data and still be able to search it.',
      }),
    ],
  },
  delete: {
    color: '#DDD',
    description: (phase: IlmPolicyPhase | IlmPolicyDeletePhase) => [
      i18n.translate('xpack.streams.streamDetailLifecycle.deletePhaseDescription', {
        defaultMessage: 'Data deleted after {duration}.',
        values: { duration: phase.min_age! },
      }),
    ],
  },
};
