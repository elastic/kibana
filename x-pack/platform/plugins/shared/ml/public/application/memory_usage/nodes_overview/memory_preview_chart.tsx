/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { FC } from 'react';
import React, { useMemo } from 'react';
import type { SeriesColorAccessor } from '@elastic/charts';
import {
  Axis,
  BarSeries,
  Chart,
  Position,
  ScaleType,
  Settings,
  LineAnnotation,
  AnnotationDomainType,
  Tooltip,
  LEGACY_LIGHT_THEME,
} from '@elastic/charts';
import { EuiIcon } from '@elastic/eui';
import { FIELD_FORMAT_IDS } from '@kbn/field-formats-plugin/common';
import type { NodeDeploymentStatsResponse } from '../../../../common/types/trained_models';
import { useFieldFormatter } from '../../contexts/kibana/use_field_formatter';
import { getMemoryItemColor } from '../memory_item_colors';
import { useMlKibana } from '../../contexts/kibana';

interface MemoryPreviewChartProps {
  memoryOverview: NodeDeploymentStatsResponse['memory_overview'];
}

export const MemoryPreviewChart: FC<MemoryPreviewChartProps> = ({ memoryOverview }) => {
  const bytesFormatter = useFieldFormatter(FIELD_FORMAT_IDS.BYTES);
  const {
    services: { charts: chartsService },
  } = useMlKibana();

  const groups = useMemo(
    () => ({
      jvm: {
        name: i18n.translate('xpack.ml.trainedModels.nodesList.jvmHeapSIze', {
          defaultMessage: 'JVM heap size',
        }),
        color: getMemoryItemColor('jvm-heap-size'),
      },
      trained_models: {
        name: i18n.translate('xpack.ml.trainedModels.nodesList.modelsMemoryUsage', {
          defaultMessage: 'Trained models',
        }),
        color: getMemoryItemColor('trained-model'),
      },
      anomaly_detection: {
        name: i18n.translate('xpack.ml.trainedModels.nodesList.adMemoryUsage', {
          defaultMessage: 'Anomaly detection jobs',
        }),
        color: getMemoryItemColor('anomaly-detector'),
      },
      dfa_training: {
        name: i18n.translate('xpack.ml.trainedModels.nodesList.dfaMemoryUsage', {
          defaultMessage: 'Data frame analytics jobs',
        }),
        color: getMemoryItemColor('data-frame-analytics'),
      },
      available: {
        name: i18n.translate('xpack.ml.trainedModels.nodesList.availableMemory', {
          defaultMessage: 'Estimated available memory',
        }),
        color: getMemoryItemColor('estimated-available-memory'),
      },
    }),
    []
  );

  const chartData = [
    {
      x: 0,
      y: memoryOverview.trained_models.total,
      g: groups.trained_models.name,
    },
    {
      x: 0,
      y: memoryOverview.anomaly_detection.total,
      g: groups.anomaly_detection.name,
    },
    {
      x: 0,
      y: memoryOverview.dfa_training.total,
      g: groups.dfa_training.name,
    },
    {
      x: 0,
      y:
        memoryOverview.machine_memory.total -
        memoryOverview.machine_memory.jvm -
        memoryOverview.trained_models.total -
        memoryOverview.dfa_training.total -
        memoryOverview.anomaly_detection.total,
      g: groups.available.name,
    },
    {
      x: 0,
      y: memoryOverview.machine_memory.jvm,
      g: groups.jvm.name,
    },
  ];

  const barSeriesColorAccessor: SeriesColorAccessor = ({ specId, yAccessor, splitAccessors }) => {
    const group = splitAccessors.get('g');

    return Object.values(groups).find((v) => v.name === group)!.color;
  };

  return (
    <Chart size={['100%', 50]}>
      <Tooltip
        headerFormatter={({ value }) =>
          i18n.translate('xpack.ml.trainedModels.nodesList.memoryBreakdown', {
            defaultMessage: 'Approximate memory breakdown',
          })
        }
      />
      <Settings
        theme={{ chartMargins: LEGACY_LIGHT_THEME.chartMargins }}
        baseTheme={chartsService.theme.useChartsBaseTheme()}
        rotation={90}
        locale={i18n.getLocale()}
      />

      <Axis
        id="ml_memory"
        position={Position.Bottom}
        hide
        tickFormat={(d: number) => bytesFormatter(d)}
      />

      <LineAnnotation
        id="line_annotation"
        domainType={AnnotationDomainType.YDomain}
        dataValues={[
          {
            dataValue: memoryOverview.ml_max_in_bytes,
            details: bytesFormatter(memoryOverview.ml_max_in_bytes),
            header: i18n.translate('xpack.ml.trainedModels.nodesList.mlMaxMemory', {
              defaultMessage: 'Maximum memory permitted for ML native processes',
            }),
          },
        ]}
        marker={
          <EuiIcon
            type="arrowDown"
            aria-label={i18n.translate('xpack.ml.trainedModels.nodesList.mlMaxMemoryAriaLabel', {
              defaultMessage: 'Maximum memory permitted for ML native processes {bytes}',
              values: { bytes: bytesFormatter(memoryOverview.ml_max_in_bytes) },
            })}
          />
        }
        markerPosition={Position.Top}
      />

      <BarSeries
        id="bars"
        xScaleType={ScaleType.Linear}
        yScaleType={ScaleType.Linear}
        xAccessor="x"
        yAccessors={['y']}
        splitSeriesAccessors={['g']}
        stackAccessors={['x']}
        data={chartData}
        color={barSeriesColorAccessor}
      />
    </Chart>
  );
};
