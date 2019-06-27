/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { containerStyle } from '../containerStyle';
import { functionWrapper } from '../../../../__tests__/helpers/function_wrapper';
import { elasticLogo } from '../../../lib/elastic_logo';
import { getFunctionErrors } from '../../../strings';

const errors = getFunctionErrors().containerStyle;

describe('containerStyle', () => {
  const fn = functionWrapper(containerStyle);

  describe('default output', () => {
    const result = fn(null);

    it('returns a containerStyle', () => {
      expect(result).to.have.property('type', 'containerStyle');
    });

    it('all style properties except `overflow` are omitted if args not provided', () => {
      expect(result).to.have.keys('type', 'overflow');
      expect(result).to.have.property('overflow', 'hidden');
    });
  });

  describe('args', () => {
    describe('border', () => {
      it('sets border', () => {
        const result = fn(null, { border: '1px solid black' });
        expect(result).to.have.property('border', '1px solid black');
      });
    });

    describe('borderRadius', () => {
      it('sets border-radius', () => {
        const result = fn(null, { borderRadius: '20px' });
        expect(result).to.have.property('borderRadius', '20px');
      });
    });

    describe('padding', () => {
      it('sets padding', () => {
        const result = fn(null, { padding: '10px' });
        expect(result).to.have.property('padding', '10px');
      });
    });

    describe('backgroundColor', () => {
      it('sets backgroundColor', () => {
        const result = fn(null, { backgroundColor: '#3f9939' });
        expect(result).to.have.property('backgroundColor', '#3f9939');
      });
    });

    describe('backgroundImage', () => {
      it('sets backgroundImage', () => {
        let result = fn(null, { backgroundImage: elasticLogo });
        expect(result).to.have.property('backgroundImage', `url(${elasticLogo})`);

        const imageURL = 'https://www.elastic.co/assets/blt45b0886c90beceee/logo-elastic.svg';
        result = fn(null, {
          backgroundImage: imageURL,
        });
        expect(result).to.have.property('backgroundImage', `url(${imageURL})`);
      });

      it('omitted when provided a null value', () => {
        let result = fn(null, { backgroundImage: '' });
        expect(result).to.not.have.property('backgroundImage');

        result = fn(null, { backgroundImage: null });
        expect(result).to.not.have.property('backgroundImage');
      });

      it('throws when provided an invalid dataurl/url', () => {
        expect(fn)
          .withArgs(null, { backgroundImage: 'foo' })
          .to.throwException(new RegExp(errors.invalidBackgroundImage('foo').message));
      });
    });

    describe('backgroundSize', () => {
      it('sets backgroundSize when backgroundImage is provided', () => {
        const result = fn(null, { backgroundImage: elasticLogo, backgroundSize: 'cover' });
        expect(result).to.have.property('backgroundSize', 'cover');
      });

      it("defaults to 'contain' when backgroundImage is provided", () => {
        const result = fn(null, { backgroundImage: elasticLogo });
        expect(result).to.have.property('backgroundSize', 'contain');
      });

      it('omitted when backgroundImage is not provided', () => {
        const result = fn(null, { backgroundSize: 'cover' });
        expect(result).to.not.have.property('backgroundSize');
      });
    });

    describe('backgroundRepeat', () => {
      it('sets backgroundRepeat when backgroundImage is provided', () => {
        const result = fn(null, { backgroundImage: elasticLogo, backgroundRepeat: 'repeat' });
        expect(result).to.have.property('backgroundRepeat', 'repeat');
      });

      it("defaults to 'no-repeat'", () => {
        const result = fn(null, { backgroundImage: elasticLogo });
        expect(result).to.have.property('backgroundRepeat', 'no-repeat');
      });

      it('omitted when backgroundImage is not provided', () => {
        const result = fn(null, { backgroundRepeat: 'repeat' });
        expect(result).to.not.have.property('backgroundRepeat');
      });
    });

    describe('opacity', () => {
      it('sets opacity', () => {
        const result = fn(null, { opacity: 0.5 });
        expect(result).to.have.property('opacity', 0.5);
      });
    });

    describe('overflow', () => {
      it('sets overflow', () => {
        let result = fn(null, { overflow: 'visible' });
        expect(result).to.have.property('overflow', 'visible');
        result = fn(null, { overflow: 'hidden' });
        expect(result).to.have.property('overflow', 'hidden');
      });
      it(`defaults to 'hidden'`, () => {
        const result = fn(null);
        expect(result).to.have.property('overflow', 'hidden');
      });
    });
  });
});
