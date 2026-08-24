/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const IMAGE_PLACEHOLDER_ATTRIBUTE = 'data-image-placeholder';
export const IMAGE_PLACEHOLDER_ICON_ATTRIBUTE = 'data-image-placeholder-icon';
export const IMAGE_PLACEHOLDER_REMOVE_ATTRIBUTE = 'data-image-placeholder-remove';

/** Scheme used in serialized image attachment markdown links. */
export const IMAGE_ATTACHMENT_SCHEME = 'image';

const DOCUMENT_ICON_PATH =
  'M3 2a1 1 0 0 1 1-1h4.707L13 5.293V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2Zm5 0H4v12h8V6H9a1 1 0 0 1-1-1V2Zm1 .707L11.293 5H9V2.707Z';

const CROSS_ICON_PATH =
  'M7.293 8 2.646 3.354l.708-.708L8 7.293l4.646-4.647.708.708L8.707 8l4.647 4.646-.707.708L8 8.707l-4.646 4.647-.708-.707L7.293 8Z';

const createDocumentIconSvg = (): SVGSVGElement => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '16');
  svg.setAttribute('height', '16');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('fill', 'currentColor');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute(IMAGE_PLACEHOLDER_ICON_ATTRIBUTE, 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', DOCUMENT_ICON_PATH);
  path.setAttribute('fill-rule', 'evenodd');
  path.setAttribute('clip-rule', 'evenodd');
  svg.appendChild(path);
  return svg;
};

const createCrossIconSvg = (): SVGSVGElement => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '16');
  svg.setAttribute('height', '16');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('fill', 'currentColor');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute(IMAGE_PLACEHOLDER_REMOVE_ATTRIBUTE, 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', CROSS_ICON_PATH);
  svg.appendChild(path);
  return svg;
};

/** Creates a non-editable inline chip representing an image attachment in the editor. */
export const createImagePlaceholderElement = (label: string): HTMLSpanElement => {
  const span = document.createElement('span');
  span.contentEditable = 'false';
  span.setAttribute(IMAGE_PLACEHOLDER_ATTRIBUTE, 'true');
  span.setAttribute('aria-label', label);
  span.dataset.placeholderName = label;

  span.appendChild(createDocumentIconSvg());
  span.appendChild(createCrossIconSvg());

  const labelSpan = document.createElement('span');
  labelSpan.className = 'image-placeholder-label';
  labelSpan.textContent = label;
  span.appendChild(labelSpan);

  return span;
};

export const isElementImagePlaceholder = (element: HTMLElement): boolean =>
  element.getAttribute(IMAGE_PLACEHOLDER_ATTRIBUTE) === 'true';

export const getPlaceholderNamesFromElement = (el: HTMLElement): string[] =>
  Array.from(el.querySelectorAll<HTMLElement>(`[${IMAGE_PLACEHOLDER_ATTRIBUTE}]`)).map(
    (s) => s.dataset.placeholderName ?? ''
  );

/** Removes the first placeholder with the given name. */
export const removePlaceholderByName = (el: HTMLElement, name: string): void => {
  const spans = el.querySelectorAll<HTMLElement>(`[${IMAGE_PLACEHOLDER_ATTRIBUTE}]`);
  for (const span of Array.from(spans)) {
    if (span.dataset.placeholderName === name) {
      span.remove();
      return;
    }
  }
};
