/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAlertContext, type AlertContext } from '@kbn/alerting-context';
import { i18n } from '@kbn/i18n';
import { v4 as uuidv4 } from 'uuid';
import { hasXYState } from './type_guards';
import type { LensSerializedState } from '..';
import type { XYByValueAnnotationLayerConfig } from '../visualizations/xy/types';

function buildAnnotationLayer(
  annotationData: AlertContext,
  indexPatternId: string
): XYByValueAnnotationLayerConfig[] {
  const {
    alert: { start: timestamp },
  } = annotationData;

  return [
    {
      layerId: uuidv4(),
      layerType: 'annotations',
      annotations: [
        {
          label: i18n.translate('xpack.lens.visualization.annotation.alertStarted', {
            defaultMessage: 'Alert started',
          }),
          type: 'manual',
          key: {
            type: 'point_in_time',
            timestamp,
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

export function annotateAlertFromContext(api: unknown, rawState: LensSerializedState) {
  const alertContext = getAlertContext(api);

  if (!alertContext) return;

  const visualization = rawState.attributes?.state.visualization;

  if (hasXYState(visualization)) {
    const indexPatternId = rawState.attributes?.references.find(
      (r) => r.type === 'index-pattern'
    )?.id;
    const annotationLayer = buildAnnotationLayer(alertContext, indexPatternId ?? '');
    visualization.layers.push(...annotationLayer);
  }
}
