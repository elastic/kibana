/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { i18n } from '@kbn/i18n';
import { XYByValueAnnotationLayerConfig } from '../visualizations/xy/types';

export function getAdhocAnnotations(
  alert: { start: string },
  indexPatternId: string
): XYByValueAnnotationLayerConfig[] {
  return [
    {
      layerId: 'annotation_alert_started',
      layerType: 'annotations',
      annotations: [
        {
          label: i18n.translate('xpack.lens.visualization.adhocAnnotation.alertStarted', {
            defaultMessage: 'Alert started',
          }),
          type: 'manual',
          key: {
            type: 'point_in_time',
            timestamp: alert.start,
          },
          icon: 'alert',
          id: uuidv4(),
        },
      ],
      indexPatternId,
      ignoreGlobalFilters: false,
    },
  ];
}
