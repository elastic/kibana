/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import get from 'lodash/fp/get';
import getOr from 'lodash/fp/getOr';
import { getLuminance, parseToHsl, parseToRgb, rgba, shade, tint } from 'polished';

type PropReader = <Prop, Default = any>(props: object, defaultValue?: Default) => Prop;

const asPropReader = (reader: string | string[] | PropReader) =>
  typeof reader === 'function'
    ? reader
    : <Props extends object, Prop extends keyof Props, Default>(
        props: Props,
        defaultValue?: Default
      ) => getOr(defaultValue, reader as Prop, props);

export const switchProp = Object.assign(
  (propName: string | string[] | PropReader, options: Map<any, any> | object) => (
    props: object
  ) => {
    const propValue = asPropReader(propName)(props, switchProp.default);
    if (typeof propValue === 'undefined') {
      return;
    }
    return options instanceof Map ? options.get(propValue) : get(propValue, options);
  },
  {
    default: Symbol('default'),
  }
);

export const ifProp = <Pass, Fail>(
  propName: string | string[] | PropReader,
  pass: Pass,
  fail: Fail
) => (props: object) => (asPropReader(propName)(props) ? pass : fail);

export const tintOrShade = (
  textColor: string,
  color: string,
  tintFraction: number,
  shadeFraction: number
) => {
  if (parseToHsl(textColor).lightness > 0.5) {
    return shade(1 - shadeFraction, color);
  } else {
    return tint(1 - tintFraction, color);
  }
};

export const getContrast = (color1: string, color2: string): number => {
  const luminance1 = getLuminance(color1);
  const luminance2 = getLuminance(color2);

  return parseFloat(
    (luminance1 > luminance2
      ? (luminance1 + 0.05) / (luminance2 + 0.05)
      : (luminance2 + 0.05) / (luminance1 + 0.05)
    ).toFixed(2)
  );
};

export const chooseLightOrDarkColor = (
  backgroundColor: string,
  lightColor: string,
  darkColor: string
) => {
  if (getContrast(backgroundColor, lightColor) > getContrast(backgroundColor, darkColor)) {
    return lightColor;
  } else {
    return darkColor;
  }
};

export const transparentize = (amount: number, color: string): string => {
  if (color === 'transparent') {
    return color;
  }

  const parsedColor = parseToRgb(color);
  const alpha: number =
    'alpha' in parsedColor && typeof parsedColor.alpha === 'number' ? parsedColor.alpha : 1;
  const colorWithAlpha = {
    ...parsedColor,
    alpha: clampValue((alpha * 100 - amount * 100) / 100, 0, 1),
  };

  return rgba(colorWithAlpha);
};

export const clampValue = (value: number, minValue: number, maxValue: number) =>
  Math.max(minValue, Math.min(maxValue, value));
