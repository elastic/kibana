/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_EMS_ROADMAP_ID } from '@kbn/maps-ems-plugin/common';
import { SOURCE_TYPES } from '../constants';
import { LayerDescriptor, EMSTMSSourceDescriptor } from '../descriptor_types';
import type { MapAttributes } from '../content_management';

// LightModeDefault added to EMSTMSSourceDescriptor in 8.0.0
// to avoid changing auto selected light mode tiles for maps created < 8.0.0
// < 8.0.0 did not specify defaults and used bright for light mode
// > 8.0.0 changed default light mode from bright to desaturated
export function setEmsTmsDefaultModes({
  attributes,
}: {
  attributes: MapAttributes;
}): MapAttributes {
  if (!attributes || !attributes.layerListJSON) {
    return attributes;
  }

  let layerList: LayerDescriptor[] = [];
  try {
    layerList = JSON.parse(attributes.layerListJSON);
  } catch (e) {
    throw new Error('Unable to parse attribute layerListJSON');
  }

  layerList.forEach((layerDescriptor: LayerDescriptor) => {
    if (layerDescriptor.sourceDescriptor?.type === SOURCE_TYPES.EMS_TMS) {
      const sourceDescriptor = layerDescriptor.sourceDescriptor as EMSTMSSourceDescriptor;
      // auto select bright tiles for EMS_TMS layers created before 8.0.0
      if (!sourceDescriptor.lightModeDefault) {
        sourceDescriptor.lightModeDefault = DEFAULT_EMS_ROADMAP_ID;
      }
    }
  });

  return {
    ...attributes,
    layerListJSON: JSON.stringify(layerList),
  };
}
