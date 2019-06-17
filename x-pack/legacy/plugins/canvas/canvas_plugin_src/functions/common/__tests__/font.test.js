/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { openSans } from '../../../../common/lib/fonts';
import { font } from '../font';
import { functionWrapper } from '../../../../__tests__/helpers/function_wrapper';

describe('font', () => {
  const fn = functionWrapper(font);

  describe('default output', () => {
    const result = fn(null);

    it('returns a style', () => {
      expect(result).toHaveProperty('type', 'style');
      expect(result).toHaveProperty('spec');
      expect(result).toHaveProperty('css');
    });
  });

  describe('args', () => {
    describe('size', () => {
      it('sets font size', () => {
        const result = fn(null, { size: 20 });
        expect(result.spec).toHaveProperty('fontSize', '20px');
        expect(result.css).toContain('font-size:20px');
      });

      it('defaults to 14px', () => {
        const result = fn(null);
        expect(result.spec).toHaveProperty('fontSize', '14px');
        expect(result.css).toContain('font-size:14px');
      });
    });

    describe('lHeight', () => {
      it('sets line height', () => {
        const result = fn(null, { lHeight: 30 });
        expect(result.spec).toHaveProperty('lineHeight', '30px');
        expect(result.css).toContain('line-height:30px');
      });

      it('defaults to 1', () => {
        const result = fn(null);
        expect(result.spec).toHaveProperty('lineHeight', '1');
        expect(result.css).toContain('line-height:1');
      });
    });

    describe('family', () => {
      it('sets font family', () => {
        const result = fn(null, { family: 'Optima, serif' });
        expect(result.spec).toHaveProperty('fontFamily', 'Optima, serif');
        expect(result.css).toContain('font-family:Optima, serif');
      });

      it(`defaults to "${openSans.value}"`, () => {
        const result = fn(null);
        expect(result.spec).toHaveProperty('fontFamily', `"${openSans.value}"`);
        expect(result.css).toContain(`font-family:"${openSans.value}"`);
      });
    });

    describe('color', () => {
      it('sets font color', () => {
        const result = fn(null, { color: 'blue' });
        expect(result.spec).toHaveProperty('color', 'blue');
        expect(result.css).toContain('color:blue');
      });
    });

    describe('weight', () => {
      it('sets font weight', () => {
        let result = fn(null, { weight: 'normal' });
        expect(result.spec).toHaveProperty('fontWeight', 'normal');
        expect(result.css).toContain('font-weight:normal');

        result = fn(null, { weight: 'bold' });
        expect(result.spec).toHaveProperty('fontWeight', 'bold');
        expect(result.css).toContain('font-weight:bold');

        result = fn(null, { weight: 'bolder' });
        expect(result.spec).toHaveProperty('fontWeight', 'bolder');
        expect(result.css).toContain('font-weight:bolder');

        result = fn(null, { weight: 'lighter' });
        expect(result.spec).toHaveProperty('fontWeight', 'lighter');
        expect(result.css).toContain('font-weight:lighter');

        result = fn(null, { weight: '400' });
        expect(result.spec).toHaveProperty('fontWeight', '400');
        expect(result.css).toContain('font-weight:400');
      });

      it("defaults to 'normal'", () => {
        const result = fn(null);
        expect(result.spec).toHaveProperty('fontWeight', 'normal');
        expect(result.css).toContain('font-weight:normal');
      });

      it('throws when provided an invalid weight', () => {
        expect(() => fn(null, { weight: 'foo' })).toThrow(`Invalid font weight: 'foo'`);
      });
    });

    describe('underline', () => {
      it('sets text underline', () => {
        let result = fn(null, { underline: true });
        expect(result.spec).toHaveProperty('textDecoration', 'underline');
        expect(result.css).toContain('text-decoration:underline');

        result = fn(null, { underline: false });
        expect(result.spec).toHaveProperty('textDecoration', 'none');
        expect(result.css).toContain('text-decoration:none');
      });

      it('defaults to false', () => {
        const result = fn(null);
        expect(result.spec).toHaveProperty('textDecoration', 'none');
        expect(result.css).toContain('text-decoration:none');
      });
    });

    describe('italic', () => {
      it('sets italic', () => {
        let result = fn(null, { italic: true });
        expect(result.spec).toHaveProperty('fontStyle', 'italic');
        expect(result.css).toContain('font-style:italic');

        result = fn(null, { italic: false });
        expect(result.spec).toHaveProperty('fontStyle', 'normal');
        expect(result.css).toContain('font-style:normal');
      });

      it('defaults to false', () => {
        const result = fn(null);
        expect(result.spec).toHaveProperty('fontStyle', 'normal');
        expect(result.css).toContain('font-style:normal');
      });
    });

    describe('align', () => {
      it('sets text alignment', () => {
        let result = fn(null, { align: 'left' });
        expect(result.spec).toHaveProperty('textAlign', 'left');
        expect(result.css).toContain('text-align:left');

        result = fn(null, { align: 'center' });
        expect(result.spec).toHaveProperty('textAlign', 'center');
        expect(result.css).toContain('text-align:center');

        result = fn(null, { align: 'right' });
        expect(result.spec).toHaveProperty('textAlign', 'right');
        expect(result.css).toContain('text-align:right');

        result = fn(null, { align: 'justify' });
        expect(result.spec).toHaveProperty('textAlign', 'justify');
        expect(result.css).toContain('text-align:justify');
      });

      it(`defaults to 'left'`, () => {
        const result = fn(null);
        expect(result.spec).toHaveProperty('textAlign', 'left');
        expect(result.css).toContain('text-align:left');
      });

      it('throws when provided an invalid alignment', () => {
        expect(() => {
          fn(null, { align: 'foo' });
        }).toThrow(`Invalid text alignment: 'foo'`);
      });
    });
  });
});
