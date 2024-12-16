/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Moment } from 'moment';
import { has, isNumber } from 'lodash';
import { set } from '@kbn/safer-lodash-set';
import { Doc, ParsedSchedule } from '../types';
import { createDataShapeFunction } from './data_shapes';

export const replaceMetricsWithShapes = (
  timestamp: Moment,
  schedule: ParsedSchedule,
  docs: Doc[]
): Doc[] => {
  const { metrics } = schedule;
  if (metrics != null && metrics.length) {
    return docs.map((doc) => {
      for (const metric of metrics) {
        if (has(doc, metric.name)) {
          const startPoint = { x: schedule.start, y: metric.start };
          const endPoint = { x: isNumber(schedule.end) ? schedule.end : Date.now(), y: metric.end };
          const fn = createDataShapeFunction(
            metric.method,
            startPoint,
            endPoint,
            metric.randomness ?? 0,
            metric.period ?? 1000
          );
          set(doc, metric.name, fn(timestamp));
        }
      }
      return doc;
    });
  }
  return docs;
};
