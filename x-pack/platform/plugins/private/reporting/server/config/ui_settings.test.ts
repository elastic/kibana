/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { range } from 'lodash';
import { PdfLogoSchema } from './ui_settings';

test('validates when provided with image data', () => {
  const jpgString =
    `data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAoHCBcUFBUUExUYGRUaGRsZGxsZHB8bIh0iGhgbGxkbGx8dIy0kGx0rIiIbJTcoKi8xNDU0ISY6Pzo2` +
    `+8snFz9eWgvYKS4ZsvS05zRQsDveIzH4Er4iDtr6iICIiAiIgIiICIiD//2Q==`;
  expect(PdfLogoSchema.validate(jpgString)).toBe(jpgString);

  const pngString =
    `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAO4AAADUCAMAAACs0e/bAAAAjVBMVEX////8/Pz4+Pj5+fnb29vz8/Px8fFeXl7r6+u/v79nZ` +
    `tcAAAAASUVORK5CYII=`;
  expect(PdfLogoSchema.validate(pngString)).toBe(pngString);

  const gifString =
    `data:image/gif;base64,R0lGODlhoADIAPYAAO/w7wgFBwsLCxMTExsbGyMjI5SUlLS0tLu7u9vb2+Hh4e/v7/Ds7////0NDQ2RkZCkXJO/w8PLy8g8QD` +
    `53IIefTH3WR4N8lXzvKWu/zlMI+5zGdO85rb/OY4z7nOd87znvv850APutCHTvSiG/3oSE+60pfO9KY7/elQj7rU5xIIADs=`;
  expect(PdfLogoSchema.validate(gifString)).toBe(gifString);

  const svgString =
    `data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjwhLS0gQ3JlYXRlZCB3aXR` +
    `AgPC9nPgogIDwvZz4KPC9zdmc+Cg==`;
  expect(PdfLogoSchema.validate(svgString)).toBe(svgString);
});

test('validates if provided with null / undefined value', () => {
  expect(() => PdfLogoSchema.validate(undefined)).not.toThrow();
  expect(() => PdfLogoSchema.validate(null)).not.toThrow();
});

test('throws validation error if provided with data over max size', () => {
  const largeJpgMock =
    `data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAoHCBcUFBUUExUYGRUaGRsZGxsZHB8bIh0iGhgbGxkbGx8dIy0kGx0rIiIbJTcoKi8xNDU0ISY6Pzo2` +
    range(0, 2050)
      .map(
        () =>
          `Pi0zNDMBCwsLBgYGEAYGEDEcFRwxMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMf/AABEIAOgA2gMBIgACEQEDEQH/xAAcAAEAAgMBAQE`
      )
      .join('') +
    `+8snFz9eWgvYKS4ZsvS05zRQsDveIzH4Er4iDtr6iICIiAiIgIiICIiD//2Q==`;
  expect(() => PdfLogoSchema.validate(largeJpgMock)).toThrowError(/too large/);
});

test('throws validation error if provided with non-image data', () => {
  expect(() => PdfLogoSchema.validate('')).toThrowErrorMatchingInlineSnapshot(`
    "types that failed validation:
    - [0]: Sorry, that file will not work. Please try a different image file.
    - [1]: expected value to equal [null]"
  `);
  expect(() => PdfLogoSchema.validate(true)).toThrowErrorMatchingInlineSnapshot(`
    "types that failed validation:
    - [0]: expected value of type [string] but got [boolean]
    - [1]: expected value to equal [null]"
  `);
  expect(() => PdfLogoSchema.validate(false)).toThrowErrorMatchingInlineSnapshot(`
    "types that failed validation:
    - [0]: expected value of type [string] but got [boolean]
    - [1]: expected value to equal [null]"
  `);
  expect(() => PdfLogoSchema.validate({})).toThrowErrorMatchingInlineSnapshot(`
    "types that failed validation:
    - [0]: expected value of type [string] but got [Object]
    - [1]: expected value to equal [null]"
  `);
  expect(() => PdfLogoSchema.validate([])).toThrowErrorMatchingInlineSnapshot(`
    "types that failed validation:
    - [0]: expected value of type [string] but got [Array]
    - [1]: expected value to equal [null]"
  `);
  expect(() => PdfLogoSchema.validate(0)).toThrowErrorMatchingInlineSnapshot(`
    "types that failed validation:
    - [0]: expected value of type [string] but got [number]
    - [1]: expected value to equal [null]"
  `);
  expect(() => PdfLogoSchema.validate(0x00f)).toThrowErrorMatchingInlineSnapshot(`
    "types that failed validation:
    - [0]: expected value of type [string] but got [number]
    - [1]: expected value to equal [null]"
  `);

  const csvString =
    `data:text/csv;base64,Il9pZCIsIl9pbmRleCIsIl9zY29yZSIsIl90eXBlIiwiZm9vLmJhciIsImZvby5iYXIua2V5d29yZCIKZjY1QU9IZ0J5bFZmWW04W` +
    `TRvb1EsYmVlLDEsIi0iLGJheixiYXoKbks1QU9IZ0J5bFZmWW04WTdZcUcsYmVlLDEsIi0iLGJvbyxib28K`;
  expect(() => PdfLogoSchema.validate(csvString)).toThrowErrorMatchingInlineSnapshot(`
    "types that failed validation:
    - [0]: Sorry, that file will not work. Please try a different image file.
    - [1]: expected value to equal [null]"
  `);

  const scriptString =
    `data:application/octet-stream;base64,QEVDSE8gT0ZGCldFRUtPRllSLkNPTSB8IEZJTkQgIlRoaXMgaXMiID4gVEVNUC5CQV` +
    `QKRUNITz5USElTLkJBVCBTRVQgV0VFSz0lJTMKQ0FMTCBURU1QLkJBVApERUwgIFRFTVAuQkFUCkRFTCAgVEhJUy5CQVQKRUNITyBXZWVrICVXRUVLJQo=`;
  expect(() => PdfLogoSchema.validate(scriptString)).toThrowErrorMatchingInlineSnapshot(`
    "types that failed validation:
    - [0]: Sorry, that file will not work. Please try a different image file.
    - [1]: expected value to equal [null]"
  `);
});
