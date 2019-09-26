/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { openSans } from '../../../../common/lib/fonts';
import { Style } from '../../../../types';

// converts the output of the font function to a flot font spec
// for font spec, see https://github.com/flot/flot/blob/master/API.md#customizing-the-axes
export const defaultSpec = {
  size: 14,
  lHeight: 21,
  style: 'normal',
  weight: 'normal',
  family: openSans.value,
  color: '#000',
};

export const getFontSpec = (argFont: Style) => {
  if (!argFont || !argFont.spec) {
    return defaultSpec;
  }

  const { fontSize, lineHeight, fontStyle, fontWeight, fontFamily, color } = argFont.spec;
  const size = fontSize && Number(fontSize.replace('px', ''));
  const lHeight = typeof lineHeight === 'string' && Number(lineHeight.replace('px', ''));

  return {
    size: size && !isNaN(size) ? size : defaultSpec.size,
    lHeight: size && !isNaN(size) ? lHeight : defaultSpec.lHeight,
    style: fontStyle || defaultSpec.style,
    weight: fontWeight || defaultSpec.weight,
    family: fontFamily || defaultSpec.family,
    color: color || defaultSpec.color,
  };
};
