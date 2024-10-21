/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EdgeLabelHeight, EdgeLabelWidth } from '../edge/styles';
import { LABEL_BORDER_WIDTH, LABEL_PADDING_X } from '../node/styles';

const LABEL_FONT = `600 7.875px Inter, "system-ui", Helvetica, Arial, sans-serif`;
const LABEL_PADDING = (LABEL_PADDING_X + LABEL_BORDER_WIDTH) * 2;

export const calcLabelSize = (label?: string) => {
  const currLblWidth = Math.max(EdgeLabelWidth, LABEL_PADDING + getTextWidth(label ?? ''));
  return { width: currLblWidth, height: EdgeLabelHeight };
};

interface GetTextWidth {
  (text: string, font?: string): number;

  // static canvas element for measuring text width
  canvas?: HTMLCanvasElement;
}

export const getTextWidth: GetTextWidth = (text: string, font: string = LABEL_FONT) => {
  // re-use canvas object for better performance
  const canvas: HTMLCanvasElement =
    getTextWidth.canvas || (getTextWidth.canvas = document.createElement('canvas'));
  const context = canvas.getContext('2d');
  if (context) {
    context.font = font;
  }
  const metrics = context?.measureText(text);
  return metrics?.width ?? 0;
};

function getCssStyle(element: HTMLElement, prop: string) {
  return window.getComputedStyle(element, null).getPropertyValue(prop);
}

// @ts-ignore will use it to get the font of the canvas on runtime
function getCanvasFont(el = document.body) {
  const fontWeight = getCssStyle(el, 'font-weight') || 'normal';
  const fontSize = getCssStyle(el, 'font-size') || '16px';
  const fontFamily = getCssStyle(el, 'font-family') || 'Times New Roman';

  return `${fontWeight} ${fontSize} ${fontFamily}`;
}
