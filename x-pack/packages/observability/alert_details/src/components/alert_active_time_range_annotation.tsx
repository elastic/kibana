/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { RectAnnotation } from '@elastic/charts';
import { i18n } from '@kbn/i18n';

interface Props {
  alertStart: number;
  alertEnd?: number;
  color: string;
  id: string;
}

const RECT_ANNOTATION_TITLE = i18n.translate(
  'observabilityAlertDetails.alertActiveTimeRangeAnnotation.detailsTooltip',
  {
    defaultMessage: 'Active',
  }
);

export function AlertActiveTimeRangeAnnotation({ alertStart, alertEnd, color, id }: Props) {
  return (
    <RectAnnotation
      id={id}
      dataValues={[
        {
          coordinates: {
            y0: 0,
            x0: alertStart,
            x1: alertEnd,
          },
          details: RECT_ANNOTATION_TITLE,
        },
      ]}
      style={{ fill: color, opacity: 0.1 }}
    />
  );
}
