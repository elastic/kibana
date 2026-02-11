/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useEuiTheme } from '@elastic/eui';
import { useMemo } from 'react';

export const useIlmPhasesColorAndDescription = () => {
  const { euiTheme } = useEuiTheme();

  return useMemo(
    () => ({
      ilmPhases: {
        hot: {
          color: euiTheme.colors.severity.risk,
          description: i18n.translate('xpack.streams.streamDetailLifecycle.hotPhaseDescription', {
            defaultMessage:
              'Use for data that is searched frequently and actively updated, optimized for indexing and search performance.',
          }),
        },
        warm: {
          color: euiTheme.colors.severity.warning,
          description: i18n.translate('xpack.streams.streamDetailLifecycle.warmPhaseDescription', {
            defaultMessage:
              'Use for data that is searched occasionally but rarely updated, optimized for search over indexing.',
          }),
        },
        cold: {
          color: euiTheme.colors.severity.neutral,
          description: i18n.translate('xpack.streams.streamDetailLifecycle.coldPhaseDescription', {
            defaultMessage:
              'Use for infrequently searched, read-only data where cost savings are prioritized over performance.',
          }),
        },
        frozen: {
          color: euiTheme.colors.vis.euiColorVis3,
          description: i18n.translate(
            'xpack.streams.streamDetailLifecycle.frozenPhaseDescription',
            {
              defaultMessage:
                'Use for long-term retention of searchable data at the lowest possible cost.',
            }
          ),
        },
        delete: {
          color: euiTheme.colors.borderBasePlain,
          description: i18n.translate(
            'xpack.streams.streamDetailLifecycle.deletePhaseDescription',
            {
              defaultMessage: 'Use to delete your data once it has reached a specified age.',
            }
          ),
        },
      },
    }),
    [euiTheme]
  );
};
