/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import maki from '@elastic/maki';
import xml2js from 'xml2js';
import { parseXmlString } from '../../../../common/parse_xml_string';

export const LARGE_MAKI_ICON_SIZE = 15;
const LARGE_MAKI_ICON_SIZE_AS_STRING = LARGE_MAKI_ICON_SIZE.toString();
export const SMALL_MAKI_ICON_SIZE = 11;
export const HALF_LARGE_MAKI_ICON_SIZE = Math.ceil(LARGE_MAKI_ICON_SIZE);

export const SYMBOLS = {};
maki.svgArray.forEach(svgString => {
  const ID_FRAG = 'id="';
  const index = svgString.indexOf(ID_FRAG);
  if (index !== -1) {
    const idStartIndex = index + ID_FRAG.length;
    const idEndIndex = svgString.substring(idStartIndex).indexOf('"') + idStartIndex;
    const fullSymbolId = svgString.substring(idStartIndex, idEndIndex);
    const symbolId = fullSymbolId.substring(0, fullSymbolId.length - 3); // remove '-15' or '-11' from id
    const symbolSize = fullSymbolId.substring(fullSymbolId.length - 2); // grab last 2 chars from id
    // only show large icons, small/large icon selection will based on configured size style
    if (symbolSize === LARGE_MAKI_ICON_SIZE_AS_STRING) {
      SYMBOLS[symbolId] = svgString;
    }
  }
});

export const SYMBOL_OPTIONS = Object.keys(SYMBOLS).map(symbolId => {
  return {
    value: symbolId,
    label: symbolId,
  };
});

export function getMakiSymbolSvg(symbolId) {
  if (!SYMBOLS[symbolId]) {
    throw new Error(`Unable to find symbol: ${symbolId}`);
  }
  return SYMBOLS[symbolId];
}

export function getMakiSymbolAnchor(symbolId) {
  switch (symbolId) {
    case 'embassy':
    case 'marker':
    case 'marker-stroked':
      return 'bottom';
    default:
      return 'center';
  }
}

export function buildSrcUrl(svgString) {
  const domUrl = window.URL || window.webkitURL || window;
  const svg = new Blob([svgString], { type: 'image/svg+xml' });
  return domUrl.createObjectURL(svg);
}

export async function styleSvg(svgString, fill, stroke, strokeWidth) {
  const svgXml = await parseXmlString(svgString);
  let style = '';
  if (fill) {
    style += `fill:${fill};`;
  }
  if (stroke) {
    style += `stroke:${stroke};`;
  }
  if (strokeWidth) {
    style += `stroke-width:${strokeWidth};`;
  }
  if (style) svgXml.svg.$.style = style;
  const builder = new xml2js.Builder();
  return builder.buildObject(svgXml);
}
