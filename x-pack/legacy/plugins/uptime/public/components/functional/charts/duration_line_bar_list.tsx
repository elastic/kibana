/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import moment from 'moment';
import { AnnotationTooltipFormatter, RectAnnotation } from '@elastic/charts';
import { RectAnnotationDatum } from '@elastic/charts/dist/chart_types/xy_chart/utils/specs';
import { ANOMALY_SEVERITY } from '../../../../../ml/common/constants/anomalies';
import { getSeverityColor, getSeverityType } from '../../../../../ml/common/util/anomaly_utils';
import { AnnotationTooltip } from './annotation_tooltip';

interface Props {
  anomalies: any;
  maxY: number;
}

export const DurationAnomaliesBar = ({ anomalies, maxY }: Props) => {
  const anomalyAnnotations: Map<string, { rect: RectAnnotationDatum[]; color: string }> = new Map();

  Object.keys(ANOMALY_SEVERITY).forEach(severityLevel => {
    anomalyAnnotations.set(severityLevel.toLowerCase(), { rect: [], color: '' });
  });

  if (anomalies?.anomalies) {
    const records = anomalies.anomalies;
    records.forEach((record: any) => {
      const severityLevel = getSeverityType(record.severity);

      const tooltipData = {
        time: record.source.timestamp,
        score: record.severity,
        severity: severityLevel,
        color: getSeverityColor(record.severity),
      };

      const anomalyRect = {
        coordinates: {
          x0: moment(record.source.timestamp).valueOf(),
          x1: moment(record.source.timestamp)
            .add(record.source.bucket_span, 's')
            .valueOf(),
        },
        details: JSON.stringify(tooltipData),
      };
      anomalyAnnotations.get(severityLevel)!.rect.push(anomalyRect);
      anomalyAnnotations.get(severityLevel)!.color = getSeverityColor(record.severity);
    });
  }

  const getRectStyle = (color: string) => {
    return {
      fill: color,
      opacity: 1,
      strokeWidth: 2,
      stroke: color,
    };
  };

  const tooltipFormatter: AnnotationTooltipFormatter = (details?: string) => {
    return <AnnotationTooltip details={details || ''} />;
  };

  return (
    <>
      {Array.from(anomalyAnnotations).map(([keyIndex, rectAnnotation]) => {
        return rectAnnotation.rect.length > 0 ? (
          <RectAnnotation
            dataValues={rectAnnotation.rect}
            key={keyIndex}
            id={keyIndex}
            style={getRectStyle(rectAnnotation.color)}
            renderTooltip={tooltipFormatter}
          />
        ) : null;
      })}
    </>
  );
};
