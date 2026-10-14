/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createImagePlaceholderElement,
  isElementImagePlaceholder,
  getPlaceholderNamesFromElement,
  removePlaceholderByName,
  IMAGE_PLACEHOLDER_ATTRIBUTE,
  IMAGE_PLACEHOLDER_ICON_ATTRIBUTE,
  IMAGE_PLACEHOLDER_REMOVE_ATTRIBUTE,
} from './image_placeholder';

describe('createImagePlaceholderElement', () => {
  it('creates a span with contenteditable=false and the correct attributes', () => {
    const el = createImagePlaceholderElement('photo.png');
    expect(el.tagName.toLowerCase()).toBe('span');
    expect(el.contentEditable).toBe('false');
    expect(el.getAttribute(IMAGE_PLACEHOLDER_ATTRIBUTE)).toBe('true');
    expect(el.getAttribute('aria-label')).toBe('photo.png');
    expect(el.dataset.placeholderName).toBe('photo.png');
  });

  it('renders the filename as visible text and includes both icons', () => {
    const el = createImagePlaceholderElement('shot.jpeg');
    expect(el.dataset.placeholderName).toBe('shot.jpeg');
    expect(el.textContent).toContain('shot.jpeg');
    const svgs = el.querySelectorAll('svg');
    expect(svgs.length).toBe(2);
  });

  it('marks the image icon with IMAGE_PLACEHOLDER_ICON_ATTRIBUTE', () => {
    const el = createImagePlaceholderElement('a.png');
    const iconSvg = el.querySelector(`[${IMAGE_PLACEHOLDER_ICON_ATTRIBUTE}]`);
    expect(iconSvg).not.toBeNull();
  });

  it('marks the cross icon with IMAGE_PLACEHOLDER_REMOVE_ATTRIBUTE', () => {
    const el = createImagePlaceholderElement('a.png');
    const removeSvg = el.querySelector(`[${IMAGE_PLACEHOLDER_REMOVE_ATTRIBUTE}]`);
    expect(removeSvg).not.toBeNull();
  });

  it('renders image icon first, cross icon second', () => {
    const el = createImagePlaceholderElement('a.png');
    const svgs = el.querySelectorAll('svg');
    expect(svgs[0].hasAttribute(IMAGE_PLACEHOLDER_ICON_ATTRIBUTE)).toBe(true);
    expect(svgs[1].hasAttribute(IMAGE_PLACEHOLDER_REMOVE_ATTRIBUTE)).toBe(true);
  });

  it('uses correct sizes for each icon', () => {
    const el = createImagePlaceholderElement('a.png');
    const svgs = el.querySelectorAll('svg');
    svgs.forEach((svg) => {
      expect(svg.getAttribute('viewBox')).toBe('0 0 16 16');
    });
    expect(svgs[0].getAttribute('width')).toBe('12');
    expect(svgs[0].getAttribute('height')).toBe('12');
    expect(svgs[1].getAttribute('width')).toBe('12');
    expect(svgs[1].getAttribute('height')).toBe('12');
  });
});

describe('isElementImagePlaceholder', () => {
  it('returns true for a placeholder element', () => {
    expect(isElementImagePlaceholder(createImagePlaceholderElement('x.png'))).toBe(true);
  });

  it('returns false for a regular span', () => {
    const span = document.createElement('span');
    expect(isElementImagePlaceholder(span)).toBe(false);
  });
});

describe('getPlaceholderNamesFromElement', () => {
  it('returns an empty array when no placeholders exist', () => {
    const container = document.createElement('div');
    container.textContent = 'hello';
    expect(getPlaceholderNamesFromElement(container)).toEqual([]);
  });

  it('returns names of all placeholders in document order', () => {
    const container = document.createElement('div');
    container.appendChild(createImagePlaceholderElement('a.png'));
    container.appendChild(document.createTextNode(' '));
    container.appendChild(createImagePlaceholderElement('b.png'));
    expect(getPlaceholderNamesFromElement(container)).toEqual(['a.png', 'b.png']);
  });
});

describe('removePlaceholderByName', () => {
  it('removes the span matching the given name', () => {
    const container = document.createElement('div');
    container.appendChild(createImagePlaceholderElement('a.png'));
    container.appendChild(createImagePlaceholderElement('b.png'));
    removePlaceholderByName(container, 'a.png');
    expect(getPlaceholderNamesFromElement(container)).toEqual(['b.png']);
  });

  it('does nothing when the name does not match', () => {
    const container = document.createElement('div');
    container.appendChild(createImagePlaceholderElement('a.png'));
    removePlaceholderByName(container, 'c.png');
    expect(getPlaceholderNamesFromElement(container)).toEqual(['a.png']);
  });

  it('only removes the first match when duplicates exist', () => {
    const container = document.createElement('div');
    container.appendChild(createImagePlaceholderElement('dup.png'));
    container.appendChild(createImagePlaceholderElement('dup.png'));
    removePlaceholderByName(container, 'dup.png');
    expect(getPlaceholderNamesFromElement(container)).toHaveLength(1);
  });
});
