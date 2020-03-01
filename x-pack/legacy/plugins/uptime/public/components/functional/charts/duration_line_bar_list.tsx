/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import moment from 'moment';
import { useParams } from 'react-router-dom';
import { RectAnnotation } from '@elastic/charts';

interface Props {
  anomalies: any;
  maxY: number;
}

export const DurationAnomaliesBar = ({ anomalies, maxY }: Props) => {
  let { monitorId } = useParams();
  monitorId = atob(monitorId || '');

  const severeAnomalyAnnotations = [];
  const mildAnnotations = [];
  if (anomalies?.records) {
    const records = anomalies.records;
    records.forEach((record: any) => {
      if (record['monitor.id']?.includes(monitorId)) {
        if (record.record_score > 25) {
          severeAnomalyAnnotations.push({
            coordinates: {
              x0: record.timestamp,
              x1: moment(record.timestamp)
                .add(record.bucket_span, 's')
                .valueOf(),
            },
            details: `Record Score with ${record.record_score}`,
          });
        } else {
          mildAnnotations.push({
            coordinates: {
              x0: record.timestamp,
              x1: moment(record.timestamp)
                .add(record.bucket_span, 's')
                .valueOf(),
            },
            details: `Record Score with ${record.record_score}`,
          });
        }
      }
    });
  }

  const style = {
    fill: 'rgb(251, 167, 64)',
    opacity: 1,
    // strokeWidth: 5,
    // strokeColor: 'rgb(251, 167, 64)',
  };
  const mildStyle = {
    fill: 'rgb(139, 200, 251)',
    opacity: 1,
    // strokeWidth: 5,
    // strokeColor: 'rgb(251, 167, 64)',
  };

  return (
    <>
      <RectAnnotation dataValues={severeAnomalyAnnotations} id="rect" style={style} />
      <RectAnnotation dataValues={mildAnnotations} id="rectMild" style={mildStyle} />
    </>
  );
};
