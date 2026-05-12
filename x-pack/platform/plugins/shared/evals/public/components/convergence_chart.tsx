/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  Axis,
  Chart,
  LineSeries,
  Position,
  ScaleType,
  Settings,
  LineAnnotation,
  AnnotationDomainType,
} from '@elastic/charts';
import { EuiPanel, EuiTitle, EuiSpacer, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface ConvergenceSeries {
  name: string;
  data: Array<{ iteration: number; score: number }>;
}

interface ConvergenceChartProps {
  series: ConvergenceSeries[];
  threshold?: number;
}

const chartTitle = i18n.translate('xpack.evals.convergenceChart.title', {
  defaultMessage: 'Convergence',
});

const iterationLabel = i18n.translate('xpack.evals.convergenceChart.iteration', {
  defaultMessage: 'Iteration',
});

const scoreLabel = i18n.translate('xpack.evals.convergenceChart.score', {
  defaultMessage: 'Score',
});

const thresholdLabel = i18n.translate('xpack.evals.convergenceChart.threshold', {
  defaultMessage: 'Threshold',
});

export const ConvergenceChart: React.FC<ConvergenceChartProps> = ({ series, threshold = 0.85 }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiPanel hasShadow={false} hasBorder>
      <EuiTitle size="xs">
        <h4>{chartTitle}</h4>
      </EuiTitle>
      <EuiSpacer size="s" />
      <Chart size={{ height: 300 }}>
        <Settings showLegend legendPosition={Position.Bottom} />
        <Axis id="bottom" position={Position.Bottom} title={iterationLabel} />
        <Axis id="left" position={Position.Left} title={scoreLabel} domain={{ min: 0, max: 1 }} />
        <LineAnnotation
          id="threshold"
          domainType={AnnotationDomainType.YDomain}
          dataValues={[{ dataValue: threshold, details: thresholdLabel }]}
          style={{
            line: {
              strokeWidth: 2,
              stroke: euiTheme.colors.warning,
              dash: [4, 4],
              opacity: 0.8,
            },
          }}
        />
        {series.map((s) => (
          <LineSeries
            key={s.name}
            id={s.name}
            name={s.name}
            xScaleType={ScaleType.Linear}
            yScaleType={ScaleType.Linear}
            xAccessor="iteration"
            yAccessors={['score']}
            data={s.data}
          />
        ))}
      </Chart>
    </EuiPanel>
  );
};
