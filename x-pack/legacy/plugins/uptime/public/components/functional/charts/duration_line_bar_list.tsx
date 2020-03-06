/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import moment from 'moment';
import { AnnotationTooltipFormatter, RectAnnotation } from '@elastic/charts';
import { RectAnnotationDatum } from '@elastic/charts/dist/chart_types/xy_chart/utils/specs';
import { ANOMALY_SEVERITY, ANOMALY_THRESHOLD } from '../../../../../ml/common/constants/anomalies';
import { getSeverityColor, getSeverityType } from '../../../../../ml/common/util/anomaly_utils';
import { AnnotationTooltip } from './annotation_tooltip';

interface Props {
  anomalies: any;
  maxY: number;
}

export const DurationAnomaliesBar = ({ anomalies, maxY }: Props) => {
  const anomalyAnnotations: Map<string, RectAnnotationDatum[]> = new Map();

  Object.keys(ANOMALY_SEVERITY).forEach(severityLevel => {
    anomalyAnnotations.set(severityLevel.toLowerCase(), []);
  });

  if (anomalies?.anomalies) {
    const records = anomalies.anomalies;
    records.forEach((record: any) => {
      const severityLevel = getSeverityType(record.severity);

      const tooltipData = {
        time: record.source.timestamp,
        score: record.severity,
        severity: severityLevel,
        color: getSeverityColor(ANOMALY_THRESHOLD[severityLevel.toUpperCase()]),
      };

      const anomalyRect = {
        coordinates: {
          x0: moment(record.source.timestamp)
            // .subtract(record.source.bucket_span / 2, 's')
            .valueOf(),
          x1: moment(record.source.timestamp)
            .add(record.source.bucket_span, 's')
            .valueOf(),
        },
        details: JSON.stringify(tooltipData),
      };
      anomalyAnnotations.get(severityLevel)!.push(anomalyRect);
    });
  }

  const getRectStyle = sevLev => {
    return {
      fill: getSeverityColor(ANOMALY_THRESHOLD[sevLev.toUpperCase()]),
      opacity: 1,
      strokeWidth: 2,
      stroke: getSeverityColor(ANOMALY_THRESHOLD[sevLev.toUpperCase()]),
    };
  };

  const tooltipFormatter: AnnotationTooltipFormatter = details => {
    return <AnnotationTooltip details={details} />;
  };

  return (
    <>
      {Array.from(anomalyAnnotations).map(([keyIndex, rectAnnotation]) => {
        return rectAnnotation.length > 0 ? (
          <RectAnnotation
            dataValues={rectAnnotation}
            key={keyIndex}
            id={keyIndex}
            style={getRectStyle(keyIndex)}
            renderTooltip={tooltipFormatter}
          />
        ) : null;
      })}
    </>
  );
};
