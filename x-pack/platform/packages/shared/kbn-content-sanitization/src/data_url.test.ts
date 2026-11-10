/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sanitizeImageDataUrl } from './data_url';

const decodeSvgDataUrl = (dataUrl: string) => {
  expect(dataUrl.startsWith('data:image/svg+xml;base64,')).toBe(true);
  return Buffer.from(dataUrl.slice('data:image/svg+xml;base64,'.length), 'base64').toString('utf8');
};

const toBase64DataUrl = (svg: string, mimeType = 'image/svg+xml') =>
  `data:${mimeType};base64,${Buffer.from(svg).toString('base64')}`;

const MALICIOUS_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)">' +
  '<script>alert(2)</script>' +
  '<a href="javascript:alert(3)"><rect width="10" height="10"/></a>' +
  '<foreignObject><iframe src="https://example.com"></iframe></foreignObject>' +
  '</svg>';

describe('sanitizeImageDataUrl', () => {
  it('removes active content from a base64 SVG data URL', () => {
    const sanitized = decodeSvgDataUrl(sanitizeImageDataUrl(toBase64DataUrl(MALICIOUS_SVG)));

    expect(sanitized).toContain('<svg xmlns="http://www.w3.org/2000/svg">');
    expect(sanitized).toContain('<rect width="10" height="10"></rect>');
    expect(sanitized).not.toMatch(/onload|<script|alert|href|foreignObject|iframe/i);
  });

  it('removes active content from a percent-encoded SVG data URL', () => {
    const sanitized = decodeSvgDataUrl(
      sanitizeImageDataUrl(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(MALICIOUS_SVG)}`)
    );

    expect(sanitized).toContain('<rect width="10" height="10"></rect>');
    expect(sanitized).not.toMatch(/onload|<script|alert|href|foreignObject|iframe/i);
  });

  it('matches the SVG media type case-insensitively', () => {
    const sanitized = decodeSvgDataUrl(
      sanitizeImageDataUrl(toBase64DataUrl(MALICIOUS_SVG, 'IMAGE/SVG+XML'))
    );

    expect(sanitized).not.toMatch(/onload|<script|alert/i);
  });

  it.each([
    ['a tab in the media type', (url: string) => url.replace('svg+xml', 'sv\tg+xml')],
    ['a newline in the media type', (url: string) => url.replace('image/', 'image\n/')],
    ['a tab in the base64 parameter', (url: string) => url.replace('base64', 'base\t64')],
    ['leading whitespace', (url: string) => `\u0001 \t${url}`],
    ['trailing whitespace', (url: string) => `${url} \n`],
  ])('sanitizes an SVG data URL with %s', (_, mutate) => {
    const sanitized = decodeSvgDataUrl(
      sanitizeImageDataUrl(mutate(toBase64DataUrl(MALICIOUS_SVG)))
    );

    expect(sanitized).toContain('<rect width="10" height="10"></rect>');
    expect(sanitized).not.toMatch(/onload|<script|alert|href|foreignObject|iframe/i);
  });

  it('percent-decodes a base64 payload before decoding it', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/></svg>';
    const base64 = Buffer.from(svg).toString('base64');
    const escaped = base64.replace(/=+$/, (padding) => padding.replace(/=/g, '%3D'));
    const clean = decodeSvgDataUrl(sanitizeImageDataUrl(`data:image/svg+xml;base64,${base64}`));

    expect(escaped).not.toBe(base64);
    expect(decodeSvgDataUrl(sanitizeImageDataUrl(`data:image/svg+xml;base64,${escaped}`))).toBe(
      clean
    );
  });

  it('returns a non-SVG data URL unchanged when it contains whitespace', () => {
    const value = ' data:image/png;base64,iVBOR\tw0KGgo=';

    expect(sanitizeImageDataUrl(value)).toBe(value);
  });

  it('keeps a benign SVG renderable', () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">' +
      '<circle cx="32" cy="32" r="30" fill="red"></circle></svg>';

    expect(decodeSvgDataUrl(sanitizeImageDataUrl(toBase64DataUrl(svg)))).toBe(svg);
  });

  it.each([
    ['a PNG data URL', 'data:image/png;base64,iVBORw0KGgo='],
    ['a JPEG data URL', 'data:image/jpeg;base64,/9j/4AAQSkZJRg=='],
    ['an empty string', ''],
    ['a non-data URL', 'https://example.com/avatar.svg'],
  ])('returns %s unchanged', (_, value) => {
    expect(sanitizeImageDataUrl(value)).toBe(value);
  });

  it('throws when a percent-encoded SVG payload cannot be decoded', () => {
    expect(() => sanitizeImageDataUrl('data:image/svg+xml,%E0%A4%A')).toThrow(
      'Failed to decode SVG data URL'
    );
  });
});
