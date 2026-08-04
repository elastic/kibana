/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const IMAGE_PLACEHOLDER_ATTRIBUTE = 'data-image-placeholder';

const DOCUMENT_ICON_PATH =
  'M3 2a1 1 0 0 1 1-1h4.707L13 5.293V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2Zm5 0H4v12h8V6H9a1 1 0 0 1-1-1V2Zm1 .707L11.293 5H9V2.707Z';

const createDocumentIconSvg = (): SVGSVGElement => {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('width', '12');
  svg.setAttribute('height', '12');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('fill', 'currentColor');
  path.setAttribute('fill-rule', 'evenodd');
  path.setAttribute('clip-rule', 'evenodd');
  path.setAttribute('d', DOCUMENT_ICON_PATH);
  svg.appendChild(path);
  return svg;
};

export const createImagePlaceholderElement = (label: string): HTMLSpanElement => {
  const span = document.createElement('span');
  span.contentEditable = 'false';
  span.setAttribute(IMAGE_PLACEHOLDER_ATTRIBUTE, 'true');
  span.setAttribute('aria-label', label);
  span.title = label;

  span.appendChild(createDocumentIconSvg());

  const textSpan = document.createElement('span');
  textSpan.textContent = label;
  span.appendChild(textSpan);

  return span;
};

export const isElementImagePlaceholder = (element: HTMLElement): boolean =>
  element.getAttribute(IMAGE_PLACEHOLDER_ATTRIBUTE) === 'true';
