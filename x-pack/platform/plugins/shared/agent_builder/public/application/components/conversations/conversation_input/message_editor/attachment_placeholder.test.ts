/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createAttachmentPlaceholderElement,
  isElementAttachmentPlaceholder,
  getPlaceholderNamesFromElement,
  removePlaceholderByName,
  ATTACHMENT_PLACEHOLDER_ATTRIBUTE,
  ATTACHMENT_PLACEHOLDER_ICON_ATTRIBUTE,
  ATTACHMENT_PLACEHOLDER_REMOVE_ATTRIBUTE,
  PLACEHOLDER_KIND_ATTRIBUTE,
  getPlaceholderKind,
  syncChipsUploadingState,
} from './attachment_placeholder';

describe('createAttachmentPlaceholderElement', () => {
  it('creates a span with contenteditable=false and the correct attributes', () => {
    const el = createAttachmentPlaceholderElement('photo.png');
    expect(el.tagName.toLowerCase()).toBe('span');
    expect(el.contentEditable).toBe('false');
    expect(el.getAttribute(ATTACHMENT_PLACEHOLDER_ATTRIBUTE)).toBe('true');
    expect(el.getAttribute('aria-label')).toBe('photo.png');
    expect(el.dataset.placeholderName).toBe('photo.png');
  });

  it('renders the filename as visible text and includes both icons', () => {
    const el = createAttachmentPlaceholderElement('shot.jpeg');
    expect(el.dataset.placeholderName).toBe('shot.jpeg');
    expect(el.textContent).toContain('shot.jpeg');
    const svgs = el.querySelectorAll('svg');
    expect(svgs.length).toBe(2);
  });

  it('marks the image icon with ATTACHMENT_PLACEHOLDER_ICON_ATTRIBUTE', () => {
    const el = createAttachmentPlaceholderElement('a.png');
    const iconSvg = el.querySelector(`[${ATTACHMENT_PLACEHOLDER_ICON_ATTRIBUTE}]`);
    expect(iconSvg).not.toBeNull();
  });

  it('marks the cross icon with ATTACHMENT_PLACEHOLDER_REMOVE_ATTRIBUTE', () => {
    const el = createAttachmentPlaceholderElement('a.png');
    const removeSvg = el.querySelector(`[${ATTACHMENT_PLACEHOLDER_REMOVE_ATTRIBUTE}]`);
    expect(removeSvg).not.toBeNull();
  });

  it('renders image icon first, cross icon second', () => {
    const el = createAttachmentPlaceholderElement('a.png');
    const svgs = el.querySelectorAll('svg');
    expect(svgs[0].hasAttribute(ATTACHMENT_PLACEHOLDER_ICON_ATTRIBUTE)).toBe(true);
    expect(svgs[1].hasAttribute(ATTACHMENT_PLACEHOLDER_REMOVE_ATTRIBUTE)).toBe(true);
  });

  it('uses correct sizes for each icon', () => {
    const el = createAttachmentPlaceholderElement('a.png');
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

describe('isElementAttachmentPlaceholder', () => {
  it('returns true for a placeholder element', () => {
    expect(isElementAttachmentPlaceholder(createAttachmentPlaceholderElement('x.png'))).toBe(true);
  });

  it('returns false for a regular span', () => {
    const span = document.createElement('span');
    expect(isElementAttachmentPlaceholder(span)).toBe(false);
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
    container.appendChild(createAttachmentPlaceholderElement('a.png'));
    container.appendChild(document.createTextNode(' '));
    container.appendChild(createAttachmentPlaceholderElement('b.png'));
    expect(getPlaceholderNamesFromElement(container)).toEqual(['a.png', 'b.png']);
  });
});

describe('removePlaceholderByName', () => {
  it('removes the span matching the given name', () => {
    const container = document.createElement('div');
    container.appendChild(createAttachmentPlaceholderElement('a.png'));
    container.appendChild(createAttachmentPlaceholderElement('b.png'));
    removePlaceholderByName(container, 'a.png');
    expect(getPlaceholderNamesFromElement(container)).toEqual(['b.png']);
  });

  it('does nothing when the name does not match', () => {
    const container = document.createElement('div');
    container.appendChild(createAttachmentPlaceholderElement('a.png'));
    removePlaceholderByName(container, 'c.png');
    expect(getPlaceholderNamesFromElement(container)).toEqual(['a.png']);
  });

  it('only removes the first match when duplicates exist', () => {
    const container = document.createElement('div');
    container.appendChild(createAttachmentPlaceholderElement('dup.png'));
    container.appendChild(createAttachmentPlaceholderElement('dup.png'));
    removePlaceholderByName(container, 'dup.png');
    expect(getPlaceholderNamesFromElement(container)).toHaveLength(1);
  });
});

describe('pdf placeholders', () => {
  it('marks the chip with its kind and defaults to image', () => {
    expect(
      createAttachmentPlaceholderElement('a.png').getAttribute(PLACEHOLDER_KIND_ATTRIBUTE)
    ).toBe('image');
    expect(
      createAttachmentPlaceholderElement('a.pdf', 'pdf').getAttribute(PLACEHOLDER_KIND_ATTRIBUTE)
    ).toBe('pdf');
  });

  it('reads the kind back, treating a chip without the attribute as an image', () => {
    expect(getPlaceholderKind(createAttachmentPlaceholderElement('a.pdf', 'pdf'))).toBe('pdf');
    const legacy = createAttachmentPlaceholderElement('a.png');
    legacy.removeAttribute(PLACEHOLDER_KIND_ATTRIBUTE);
    expect(getPlaceholderKind(legacy)).toBe('image');
  });

  it('draws the document icon instead of the image icon', () => {
    const image = createAttachmentPlaceholderElement('a.png');
    const pdf = createAttachmentPlaceholderElement('a.pdf', 'pdf');
    const imagePath = image.querySelector(`[${ATTACHMENT_PLACEHOLDER_ICON_ATTRIBUTE}] path`);
    const pdfPath = pdf.querySelector(`[${ATTACHMENT_PLACEHOLDER_ICON_ATTRIBUTE}] path`);
    expect(pdfPath?.getAttribute('d')).not.toBe(imagePath?.getAttribute('d'));
    expect(pdf.querySelectorAll('svg')).toHaveLength(2);
  });

  describe('name helpers filter by kind', () => {
    const setup = () => {
      const container = document.createElement('div');
      container.appendChild(createAttachmentPlaceholderElement('same.name'));
      container.appendChild(createAttachmentPlaceholderElement('same.name', 'pdf'));
      container.appendChild(createAttachmentPlaceholderElement('only.pdf', 'pdf'));
      return container;
    };

    it('lists the names of one kind', () => {
      const container = setup();
      expect(getPlaceholderNamesFromElement(container)).toEqual(['same.name']);
      expect(getPlaceholderNamesFromElement(container, 'pdf')).toEqual(['same.name', 'only.pdf']);
    });

    it('removes a chip of one kind only', () => {
      const container = setup();
      removePlaceholderByName(container, 'same.name', 'pdf');
      expect(getPlaceholderNamesFromElement(container)).toEqual(['same.name']);
      expect(getPlaceholderNamesFromElement(container, 'pdf')).toEqual(['only.pdf']);
    });

    it('syncs the uploading state of one kind only', () => {
      const container = setup();
      syncChipsUploadingState(container, new Set(['same.name']), 'pdf');
      const [image, pdf, otherPdf] = Array.from(container.children);
      expect(image.hasAttribute('data-uploading')).toBe(false);
      expect(pdf.getAttribute('data-uploading')).toBe('true');
      expect(otherPdf.hasAttribute('data-uploading')).toBe(false);
    });
  });
});
