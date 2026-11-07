/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import type { Writable } from '@kbn/utility-types';
import { LAYER_STYLE_TYPE, STYLE_TYPE, type VECTOR_STYLES } from '../constants';
import type { LayerDescriptor, VectorStyleDescriptor } from '../descriptor_types';
import type { StoredMapAttributes } from '../../server';

const COLOR_STYLES = [
  'fillColor', // legacy persisted key (pre snake_case rename)
  'lineColor',
  'labelColor',
  'labelBorderColor',
];

// Migrations run on persisted data, which uses the legacy camelCase keys
interface LegacyColorDescriptor {
  type: STYLE_TYPE;
  options: {
    customColorPalette?: Array<{ stop: string | null; color: string }>;
    otherCategoryColor?: string;
  };
}

function migrateColorProperty(descriptor: LegacyColorDescriptor): LegacyColorDescriptor {
  if (descriptor.type === STYLE_TYPE.STATIC) {
    return descriptor;
  }

  if (
    !descriptor.options.customColorPalette ||
    descriptor.options.customColorPalette.length === 0
  ) {
    return descriptor;
  }

  return {
    ...descriptor,
    options: {
      ...descriptor.options,
      otherCategoryColor: descriptor.options.customColorPalette[0].color,
      customColorPalette:
        descriptor.options.customColorPalette.length === 1
          ? []
          : descriptor.options.customColorPalette.slice(1),
    },
  };
}

// In 8.4 explicit "other category color" state added to ColorDynamicOptions
// Prior to 8.4, custom color ramp "other category color" stored in first element of customColorPalette
export function migrateOtherCategoryColor({
  attributes,
}: {
  attributes: StoredMapAttributes;
}): StoredMapAttributes {
  if (!attributes || !attributes.layerListJSON) {
    return attributes;
  }

  let layerList: LayerDescriptor[] = [];
  try {
    layerList = JSON.parse(attributes.layerListJSON);
  } catch (e) {
    throw new Error('Unable to parse attribute layerListJSON');
  }

  layerList.forEach((layerDescriptor) => {
    if (layerDescriptor.style?.type !== LAYER_STYLE_TYPE.VECTOR) {
      return;
    }

    Object.keys(_.get(layerDescriptor, 'style.properties', {})).forEach((key) => {
      const styleName = key as VECTOR_STYLES;
      if (!COLOR_STYLES.includes(styleName)) {
        return;
      }

      (layerDescriptor.style as Writable<VectorStyleDescriptor>)!.properties = {
        ...(layerDescriptor.style as VectorStyleDescriptor)!.properties,
        [styleName]: migrateColorProperty(
          (layerDescriptor.style as VectorStyleDescriptor)!.properties[
            styleName
          ] as unknown as LegacyColorDescriptor
        ),
      };
    });
  });

  return {
    ...attributes,
    layerListJSON: JSON.stringify(layerList),
  };
}
