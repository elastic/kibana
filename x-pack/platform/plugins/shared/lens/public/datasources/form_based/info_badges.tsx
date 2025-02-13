/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { FormBasedLayer } from '../..';
import { InfoBadge } from '../../shared_components/info_badges/info_badge';
import { FramePublicAPI, VisualizationInfo } from '../../types';
import { getSamplingValue } from './utils';

export function ReducedSamplingSectionEntries({
  layers,
  visualizationInfo,
  dataViews,
}: {
  layers: Array<[string, FormBasedLayer]>;
  visualizationInfo: VisualizationInfo;
  dataViews: FramePublicAPI['dataViews'];
}) {
  return (
    <>
      {layers.map(([id, layer], layerIndex) => {
        const dataView = dataViews.indexPatterns[layer.indexPatternId];
        const layerInfo = visualizationInfo.layers.find(({ layerId, label }) => layerId === id);
        const layerTitle =
          layerInfo?.label ||
          i18n.translate('xpack.lens.indexPattern.samplingPerLayer.fallbackLayerName', {
            defaultMessage: 'Data layer',
          });
        const layerPalette = layerInfo?.palette;
        return (
          <InfoBadge
            title={layerTitle}
            index={layerIndex}
            dataView={dataView.id}
            palette={layerPalette}
            data-test-subj-prefix="lns-feature-badges-reducedSampling"
          >
            <EuiText size="s">{`${Number(getSamplingValue(layer)) * 100}%`}</EuiText>
          </InfoBadge>
        );
      })}
    </>
  );
}
