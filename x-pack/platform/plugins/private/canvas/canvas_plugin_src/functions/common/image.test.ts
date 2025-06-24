/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ExecutionContext } from '@kbn/expressions-plugin/common';
import { elasticLogo, elasticOutline } from '../../../public/lib';
import { functionWrapper } from '@kbn/presentation-util-plugin/test_helpers';
import { image } from './image';

describe('image', () => {
  const fn = functionWrapper(image);

  it('returns an image object using a dataUrl', async () => {
    const result = await fn(
      null,
      { dataurl: elasticOutline, mode: 'cover' },
      {} as ExecutionContext
    );
    expect(result).to.have.property('type', 'image');
  });

  describe('args', () => {
    describe('dataurl', () => {
      it('sets the source of the image using dataurl', async () => {
        const result = await fn(null, { dataurl: elasticOutline }, {} as ExecutionContext);
        expect(result).to.have.property('dataurl', elasticOutline);
      });

      it.skip('sets the source of the image using url', async () => {
        // This is skipped because functionWrapper doesn't use the actual
        // interpreter and doesn't resolve aliases
        const result = await fn(null, { url: elasticOutline }, {} as ExecutionContext);
        expect(result).to.have.property('dataurl', elasticOutline);
      });

      it('defaults to the elasticLogo if not provided', async () => {
        const result = await fn(null, {}, {} as ExecutionContext);
        expect(result).to.have.property('dataurl', elasticLogo);
      });
    });

    describe('sets the mode', () => {
      it('to contain', async () => {
        const result = await fn(null, { mode: 'contain' }, {} as ExecutionContext);
        expect(result).to.have.property('mode', 'contain');
      });

      it('to cover', async () => {
        const result = await fn(null, { mode: 'cover' }, {} as ExecutionContext);
        expect(result).to.have.property('mode', 'cover');
      });

      it('to stretch', async () => {
        const result = await fn(null, { mode: 'stretch' }, {} as ExecutionContext);
        expect(result).to.have.property('mode', '100% 100%');
      });

      it("defaults to 'contain' if not provided", async () => {
        const result = await fn(null, {}, {} as ExecutionContext);
        expect(result).to.have.property('mode', 'contain');
      });
    });
  });
});
