/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { revealImage } from '../revealImage';
import { functionWrapper } from '../../../../__tests__/helpers/function_wrapper';
import { elasticOutline } from '../../../lib/elastic_outline';
import { elasticLogo } from '../../../lib/elastic_logo';
import { getFunctionErrors } from '../../../strings';

const errors = getFunctionErrors().revealImage;

describe('revealImage', () => {
  const fn = functionWrapper(revealImage);

  it('returns a render as revealImage', () => {
    const result = fn(0.5);
    expect(result)
      .to.have.property('type', 'render')
      .and.to.have.property('as', 'revealImage');
  });

  describe('context', () => {
    it('throws when context is not a number between 0 and 1', () => {
      expect(fn)
        .withArgs(10, {
          image: elasticLogo,
          emptyImage: elasticOutline,
          origin: 'top',
        })
        .to.throwException(new RegExp(errors.invalidPercent(10).message));

      expect(fn)
        .withArgs(-0.1, {
          image: elasticLogo,
          emptyImage: elasticOutline,
          origin: 'top',
        })
        .to.throwException(new RegExp(errors.invalidPercent(-0.1).message));
    });
  });

  describe('args', () => {
    describe('image', () => {
      it('sets the image', () => {
        const result = fn(0.89, { image: elasticLogo }).value;
        expect(result).to.have.property('image', elasticLogo);
      });

      it('defaults to the Elastic outline logo', () => {
        const result = fn(0.89).value;
        expect(result).to.have.property('image', elasticOutline);
      });
    });

    describe('emptyImage', () => {
      it('sets the background image', () => {
        const result = fn(0, { emptyImage: elasticLogo }).value;
        expect(result).to.have.property('emptyImage', elasticLogo);
      });

      it('sets emptyImage to undefined', () => {
        const result = fn(0).value;
        expect(result).to.have.property('emptyImage', undefined);
      });
    });

    describe('origin', () => {
      it('sets which side to start the reveal from', () => {
        let result = fn(1, { origin: 'top' }).value;
        expect(result).to.have.property('origin', 'top');
        result = fn(1, { origin: 'left' }).value;
        expect(result).to.have.property('origin', 'left');
        result = fn(1, { origin: 'bottom' }).value;
        expect(result).to.have.property('origin', 'bottom');
        result = fn(1, { origin: 'right' }).value;
        expect(result).to.have.property('origin', 'right');
      });

      it('defaults to bottom', () => {
        const result = fn(1).value;
        expect(result).to.have.property('origin', 'bottom');
      });
    });
  });
});
