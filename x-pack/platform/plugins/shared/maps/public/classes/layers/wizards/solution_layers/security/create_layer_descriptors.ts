/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { euiPaletteColorBlind } from '@elastic/eui';
import { isAPMDataView } from '@kbn/apm-data-view';
import {
  LayerDescriptor,
  SizeDynamicOptions,
  VectorStylePropertiesDescriptor,
} from '../../../../../../common/descriptor_types';
import {
  AGG_TYPE,
  COUNT_PROP_NAME,
  FIELD_ORIGIN,
  SCALING_TYPES,
  STYLE_TYPE,
  SYMBOLIZE_AS_TYPES,
  VECTOR_STYLES,
} from '../../../../../../common/constants';
import { GeoJsonVectorLayer } from '../../../vector_layer';
import { LayerGroup } from '../../../layer_group';
import { VectorStyle } from '../../../../styles/vector/vector_style';
import { ESSearchSource } from '../../../../sources/es_search_source';
import { ESPewPewSource } from '../../../../sources/es_pew_pew_source';
import { getDefaultDynamicProperties } from '../../../../styles/vector/vector_style_defaults';

const defaultDynamicProperties = getDefaultDynamicProperties();
const euiVisColorPalette = euiPaletteColorBlind();

function getSourceField(indexPatternId: string) {
  return isAPMDataView(indexPatternId) ? 'client.geo.location' : 'source.geo.location';
}

function getDestinationField(indexPatternId: string) {
  return isAPMDataView(indexPatternId) ? 'server.geo.location' : 'destination.geo.location';
}

function createSourceLayerDescriptor(
  indexPatternId: string,
  indexPatternTitle: string,
  parentId: string
) {
  const sourceDescriptor = ESSearchSource.createDescriptor({
    indexPatternId,
    geoField: getSourceField(indexPatternId),
    scalingType: SCALING_TYPES.TOP_HITS,
    topHitsSplitField: isAPMDataView(indexPatternId) ? 'client.ip' : 'source.ip',
    tooltipProperties: isAPMDataView(indexPatternId)
      ? [
          'host.name',
          'client.ip',
          'client.domain',
          'client.geo.country_iso_code',
          'client.as.organization.name',
        ]
      : [
          'host.name',
          'source.ip',
          'source.domain',
          'source.geo.country_iso_code',
          'source.as.organization.name',
        ],
  });

  const styleProperties: Partial<VectorStylePropertiesDescriptor> = {
    [VECTOR_STYLES.FILL_COLOR]: {
      type: STYLE_TYPE.STATIC,
      options: { color: euiVisColorPalette[1] },
    },
    [VECTOR_STYLES.LINE_COLOR]: {
      type: STYLE_TYPE.STATIC,
      options: { color: '#FFFFFF' },
    },
    [VECTOR_STYLES.LINE_WIDTH]: { type: STYLE_TYPE.STATIC, options: { size: 2 } },
    [VECTOR_STYLES.SYMBOLIZE_AS]: {
      options: { value: SYMBOLIZE_AS_TYPES.ICON },
    },
    [VECTOR_STYLES.ICON]: {
      type: STYLE_TYPE.STATIC,
      options: { value: 'home' },
    },
    [VECTOR_STYLES.ICON_SIZE]: { type: STYLE_TYPE.STATIC, options: { size: 8 } },
  };

  return GeoJsonVectorLayer.createDescriptor({
    label: i18n.translate('xpack.maps.sescurity.sourceLayerLabel', {
      defaultMessage: '{indexPatternTitle} | Source Point',
      values: { indexPatternTitle },
    }),
    parent: parentId,
    sourceDescriptor,
    style: VectorStyle.createDescriptor(styleProperties),
  });
}

function createDestinationLayerDescriptor(
  indexPatternId: string,
  indexPatternTitle: string,
  parentId: string
) {
  const sourceDescriptor = ESSearchSource.createDescriptor({
    indexPatternId,
    geoField: getDestinationField(indexPatternId),
    scalingType: SCALING_TYPES.TOP_HITS,
    topHitsSplitField: isAPMDataView(indexPatternId) ? 'server.ip' : 'destination.ip',
    tooltipProperties: isAPMDataView(indexPatternId)
      ? [
          'host.name',
          'server.ip',
          'server.domain',
          'server.geo.country_iso_code',
          'server.as.organization.name',
        ]
      : [
          'host.name',
          'destination.ip',
          'destination.domain',
          'destination.geo.country_iso_code',
          'destination.as.organization.name',
        ],
  });

  const styleProperties: Partial<VectorStylePropertiesDescriptor> = {
    [VECTOR_STYLES.FILL_COLOR]: {
      type: STYLE_TYPE.STATIC,
      options: { color: euiVisColorPalette[2] },
    },
    [VECTOR_STYLES.LINE_COLOR]: {
      type: STYLE_TYPE.STATIC,
      options: { color: '#FFFFFF' },
    },
    [VECTOR_STYLES.LINE_WIDTH]: { type: STYLE_TYPE.STATIC, options: { size: 2 } },
    [VECTOR_STYLES.SYMBOLIZE_AS]: {
      options: { value: SYMBOLIZE_AS_TYPES.ICON },
    },
    [VECTOR_STYLES.ICON]: {
      type: STYLE_TYPE.STATIC,
      options: { value: 'marker' },
    },
    [VECTOR_STYLES.ICON_SIZE]: { type: STYLE_TYPE.STATIC, options: { size: 8 } },
  };

  return GeoJsonVectorLayer.createDescriptor({
    label: i18n.translate('xpack.maps.sescurity.destinationLayerLabel', {
      defaultMessage: '{indexPatternTitle} | Destination point',
      values: { indexPatternTitle },
    }),
    parent: parentId,
    sourceDescriptor,
    style: VectorStyle.createDescriptor(styleProperties),
  });
}

function createLineLayerDescriptor(
  indexPatternId: string,
  indexPatternTitle: string,
  parentId: string
) {
  const sourceDescriptor = ESPewPewSource.createDescriptor({
    indexPatternId,
    sourceGeoField: getSourceField(indexPatternId),
    destGeoField: getDestinationField(indexPatternId),
    metrics: [
      {
        type: AGG_TYPE.SUM,
        field: isAPMDataView(indexPatternId) ? 'client.bytes' : 'source.bytes',
      },
      {
        type: AGG_TYPE.SUM,
        field: isAPMDataView(indexPatternId) ? 'server.bytes' : 'destination.bytes',
      },
    ],
  });

  const styleProperties: Partial<VectorStylePropertiesDescriptor> = {
    [VECTOR_STYLES.LINE_COLOR]: {
      type: STYLE_TYPE.STATIC,
      options: { color: euiVisColorPalette[1] },
    },
    [VECTOR_STYLES.LINE_WIDTH]: {
      type: STYLE_TYPE.DYNAMIC,
      options: {
        ...(defaultDynamicProperties[VECTOR_STYLES.LINE_WIDTH].options as SizeDynamicOptions),
        field: {
          name: COUNT_PROP_NAME,
          origin: FIELD_ORIGIN.SOURCE,
        },
        minSize: 1,
        maxSize: 8,
      },
    },
  };

  return GeoJsonVectorLayer.createDescriptor({
    label: i18n.translate('xpack.maps.sescurity.lineLayerLabel', {
      defaultMessage: '{indexPatternTitle} | Line',
      values: { indexPatternTitle },
    }),
    parent: parentId,
    sourceDescriptor,
    style: VectorStyle.createDescriptor(styleProperties),
  });
}

export function createSecurityLayerDescriptors(
  indexPatternId: string,
  indexPatternTitle: string
): LayerDescriptor[] {
  const layerGroupDescriptor = LayerGroup.createDescriptor({ label: indexPatternTitle });
  return [
    createSourceLayerDescriptor(indexPatternId, indexPatternTitle, layerGroupDescriptor.id),
    createDestinationLayerDescriptor(indexPatternId, indexPatternTitle, layerGroupDescriptor.id),
    createLineLayerDescriptor(indexPatternId, indexPatternTitle, layerGroupDescriptor.id),
    layerGroupDescriptor,
  ];
}
