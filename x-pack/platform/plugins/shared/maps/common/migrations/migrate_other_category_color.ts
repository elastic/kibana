/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LAYER_STYLE_TYPE, STYLE_TYPE, VECTOR_STYLES } from '../constants';
import type { StoredLayer } from './stored_layer';
import type { StoredMapAttributes } from '../../server';

const COLOR_STYLES = [
  VECTOR_STYLES.FILL_COLOR,
  VECTOR_STYLES.LINE_COLOR,
  VECTOR_STYLES.LABEL_COLOR,
  VECTOR_STYLES.LABEL_BORDER_COLOR,
];

interface StoredColorProperty {
  type: STYLE_TYPE;
  options: {
    customColorPalette?: Array<{ stop: string | null; color: string }>;
    [key: string]: unknown;
  };
}

function migrateColorProperty(descriptor: StoredColorProperty): StoredColorProperty {
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

  let layerList: StoredLayer[] = [];
  try {
    layerList = JSON.parse(attributes.layerListJSON);
  } catch (e) {
    throw new Error('Unable to parse attribute layerListJSON');
  }

  layerList.forEach((layerDescriptor) => {
    if (layerDescriptor.style?.type !== LAYER_STYLE_TYPE.VECTOR) {
      return;
    }

    Object.keys(layerDescriptor.style.properties ?? {}).forEach((key) => {
      const styleName = key as VECTOR_STYLES;
      if (!COLOR_STYLES.includes(styleName)) {
        return;
      }

      const style = layerDescriptor.style!;
      style.properties = {
        ...style.properties,
        [styleName]: migrateColorProperty(style.properties![styleName] as StoredColorProperty),
      };
    });
  });

  return {
    ...attributes,
    layerListJSON: JSON.stringify(layerList),
  };
}
