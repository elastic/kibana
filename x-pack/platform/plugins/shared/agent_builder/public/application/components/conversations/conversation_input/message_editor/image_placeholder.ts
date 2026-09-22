/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { insertNodeAtCursor, insertSpaceAfter, placeCursorAfter } from './utils';

export const IMAGE_PLACEHOLDER_ATTRIBUTE = 'data-image-placeholder';
export const IMAGE_PLACEHOLDER_ICON_ATTRIBUTE = 'data-image-placeholder-icon';
export const IMAGE_PLACEHOLDER_REMOVE_ATTRIBUTE = 'data-image-placeholder-remove';

/** Scheme used in serialized image attachment markdown links. */
export const IMAGE_ATTACHMENT_SCHEME = 'image';

// Mirrors the EUI `image` icon (packages/eui/src/components/icon/assets/image.tsx).
// Inlined because the placeholder is imperative DOM inside contentEditable — React can't own it.
const IMAGE_ICON_PATHS = [
  'M6 4a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm0 1a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z',
  'M14.102 2.005A1 1 0 0 1 15 3v10a.962.962 0 0 1-.012.143l-.008.058a.993.993 0 0 1-.077.226l-.012.028-.03.05-.022.038-.023.032a.997.997 0 0 1-.1.121l-.02.022a.979.979 0 0 1-.075.064l-.04.03-.033.023a1.013 1.013 0 0 1-.057.034l-.021.013a.952.952 0 0 1-.052.025c-.012.006-.024.013-.037.018a.998.998 0 0 1-.07.025l-.015.005A.997.997 0 0 1 14 14H2a1 1 0 0 1-.128-.01l-.037-.005a1.007 1.007 0 0 1-.122-.028l-.02-.007a.98.98 0 0 1-.111-.043l-.018-.008a1.02 1.02 0 0 1-.116-.066l-.01-.006a1.002 1.002 0 0 1-.292-.306l-.01-.017a.992.992 0 0 1-.131-.402L1 13V3a1 1 0 0 1 1-1h12l.102.005Zm-6.395 9.288L9.414 13H14v-2l-3-3-3.293 3.293ZM2 13h6l-3-3-3 3Zm0-1.414 2.293-2.293a1 1 0 0 1 1.414 0L7 10.586l3.293-3.293a1 1 0 0 1 1.414 0L14 9.586V3H2v8.586Z',
];

const CROSS_ICON_PATH =
  'M7.293 8 2.646 3.354l.708-.708L8 7.293l4.646-4.647.708.708L8.707 8l4.647 4.646-.707.708L8 8.707l-4.646 4.647-.708-.707L7.293 8Z';

const createImageIconSvg = (): SVGSVGElement => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '12');
  svg.setAttribute('height', '12');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('fill', 'currentColor');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute(IMAGE_PLACEHOLDER_ICON_ATTRIBUTE, 'true');
  for (const d of IMAGE_ICON_PATHS) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    path.setAttribute('fill-rule', 'evenodd');
    path.setAttribute('clip-rule', 'evenodd');
    svg.appendChild(path);
  }
  return svg;
};

const createCrossIconSvg = (): SVGSVGElement => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '12');
  svg.setAttribute('height', '12');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('fill', 'currentColor');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute(IMAGE_PLACEHOLDER_REMOVE_ATTRIBUTE, 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', CROSS_ICON_PATH);
  svg.appendChild(path);
  return svg;
};

export const createImagePlaceholderElement = (label: string): HTMLSpanElement => {
  const span = document.createElement('span');
  span.contentEditable = 'false';
  span.setAttribute(IMAGE_PLACEHOLDER_ATTRIBUTE, 'true');
  span.setAttribute('role', 'img');
  span.setAttribute('aria-label', label);
  span.dataset.placeholderName = label;

  span.appendChild(createImageIconSvg());
  span.appendChild(createCrossIconSvg());

  const labelSpan = document.createElement('span');
  labelSpan.className = 'image-placeholder-label';
  labelSpan.textContent = label;
  span.appendChild(labelSpan);

  const progressTrack = document.createElement('span');
  progressTrack.className = 'image-placeholder-progress-track';
  progressTrack.setAttribute('aria-hidden', 'true');
  const progressFill = document.createElement('span');
  progressFill.className = 'image-placeholder-progress-fill';
  progressTrack.appendChild(progressFill);
  span.appendChild(progressTrack);

  return span;
};

/**
 * Creates a placeholder chip for `label`, inserts it at the current cursor position,
 * and moves the caret to just after it (via a trailing non-breaking space).
 */
export const insertImagePlaceholderChip = (label: string): void => {
  const chipEl = createImagePlaceholderElement(label);
  chipEl.setAttribute('data-uploading', 'true');
  insertNodeAtCursor(chipEl);
  const sel = window.getSelection();
  if (sel) {
    const space = insertSpaceAfter(chipEl, chipEl.parentNode as HTMLElement);
    placeCursorAfter(space, sel);
  }
};

export const isElementImagePlaceholder = (element: HTMLElement): boolean =>
  element.getAttribute(IMAGE_PLACEHOLDER_ATTRIBUTE) === 'true';

export const getPlaceholderNamesFromElement = (el: HTMLElement): string[] =>
  Array.from(el.querySelectorAll<HTMLElement>(`[${IMAGE_PLACEHOLDER_ATTRIBUTE}]`)).map(
    (s) => s.dataset.placeholderName ?? ''
  );

export const removePlaceholderByName = (el: HTMLElement, name: string): void => {
  const spans = el.querySelectorAll<HTMLElement>(`[${IMAGE_PLACEHOLDER_ATTRIBUTE}]`);
  for (const span of Array.from(spans)) {
    if (span.dataset.placeholderName === name) {
      span.remove();
      return;
    }
  }
};

/** Sets `data-uploading` on every chip in `el` whose name is in `uploadingNames`, clears it otherwise. */
export const syncChipsUploadingState = (
  el: HTMLElement,
  uploadingNames: ReadonlySet<string> | undefined
): void => {
  el.querySelectorAll<HTMLElement>(`[${IMAGE_PLACEHOLDER_ATTRIBUTE}]`).forEach((chip) => {
    if (uploadingNames?.has(chip.dataset.placeholderName ?? '')) {
      chip.setAttribute('data-uploading', 'true');
    } else {
      chip.removeAttribute('data-uploading');
    }
  });
};

export interface HandleImagePlaceholderRemoveClickOpts {
  onChange: () => void;
  onAfterInput?: () => void;
}

/**
 * Handles a mousedown on the editor contentEditable that may have landed on a
 * placeholder chip's remove button. Removes the chip and fires callbacks when matched.
 */
export const handleImagePlaceholderRemoveClick = (
  event: MouseEvent,
  opts: HandleImagePlaceholderRemoveClickOpts
): void => {
  const target = event.target as Element;
  const removeButton = target.closest?.(`[${IMAGE_PLACEHOLDER_REMOVE_ATTRIBUTE}]`);
  if (!removeButton) return;
  const chip = removeButton.closest(`[${IMAGE_PLACEHOLDER_ATTRIBUTE}]`);
  if (!chip) return;
  event.preventDefault();
  chip.remove();
  opts.onChange();
  opts.onAfterInput?.();
};
