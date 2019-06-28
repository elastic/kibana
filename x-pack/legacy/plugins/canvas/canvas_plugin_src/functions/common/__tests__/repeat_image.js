/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { repeatImage } from '../repeatImage';
import { functionWrapper } from '../../../../__tests__/helpers/function_wrapper';
import { elasticOutline } from '../../../lib/elastic_outline';
import { elasticLogo } from '../../../lib/elastic_logo';

describe('repeatImage', () => {
  const fn = functionWrapper(repeatImage);

  it('returns a render as repeatImage', () => {
    const result = fn(10);
    expect(result)
      .to.have.property('type', 'render')
      .and.to.have.property('as', 'repeatImage');
  });

  describe('args', () => {
    describe('image', () => {
      it('sets the source of the repeated image', () => {
        const result = fn(10, { image: elasticLogo }).value;
        expect(result).to.have.property('image', elasticLogo);
      });

      it('defaults to the Elastic outline logo', () => {
        const result = fn(100000).value;
        expect(result).to.have.property('image', elasticOutline);
      });
    });

    describe('size', () => {
      it('sets the size of the image', () => {
        const result = fn(-5, { size: 200 }).value;
        expect(result).to.have.property('size', 200);
      });

      it('defaults to 100', () => {
        const result = fn(-5).value;
        expect(result).to.have.property('size', 100);
      });
    });

    describe('max', () => {
      it('sets the maximum number of a times the image is repeated', () => {
        const result = fn(100000, { max: 20 }).value;
        expect(result).to.have.property('max', 20);
      });
      it('defaults to 1000', () => {
        const result = fn(100000).value;
        expect(result).to.have.property('max', 1000);
      });
    });

    describe('emptyImage', () => {
      it('returns repeatImage object with emptyImage as undefined', () => {
        const result = fn(100000, { emptyImage: elasticLogo }).value;
        expect(result).to.have.property('emptyImage', elasticLogo);
      });
      it('sets emptyImage to undefined', () => {
        const result = fn(100000).value;
        expect(result).to.have.property('emptyImage', undefined);
      });
    });
  });
});
