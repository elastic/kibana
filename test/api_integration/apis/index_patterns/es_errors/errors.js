import expect from 'expect.js';
import { errors as esErrors } from 'elasticsearch';

import {
  isEsIndexNotFoundError,
  createNoMatchingIndicesError,
  isNoMatchingIndicesError,
  convertEsError
} from '../../../../../src/server/index_patterns/service/lib/errors';

import {
  getIndexNotFoundError,
  getDocNotFoundError
} from './lib';

export default function ({ getService }) {
  const es = getService('es');
  const esArchiver = getService('esArchiver');

  describe('index_patterns/* error handler', () => {
    let indexNotFoundError;
    let docNotFoundError;
    before(async () => {
      await esArchiver.load('index_patterns/basic_index');
      indexNotFoundError = await getIndexNotFoundError(es);
      docNotFoundError = await getDocNotFoundError(es);
    });
    after(async () => {
      await esArchiver.unload('index_patterns/basic_index');
    });

    describe('isEsIndexNotFoundError()', () => {
      it('identifies index not found errors', () => {
        if (!isEsIndexNotFoundError(indexNotFoundError)) {
          throw new Error(`Expected isEsIndexNotFoundError(indexNotFoundError) to be true`);
        }
      });

      it('rejects doc not found errors', () => {
        if (isEsIndexNotFoundError(docNotFoundError)) {
          throw new Error(`Expected isEsIndexNotFoundError(docNotFoundError) to be true`);
        }
      });
    });

    describe('createNoMatchingIndicesError()', () => {
      it('returns a boom error', () => {
        const error = createNoMatchingIndicesError();
        if (!error || !error.isBoom) {
          throw new Error(`expected ${error} to be a Boom error`);
        }
      });

      it('sets output code to "no_matching_indices"', () => {
        const error = createNoMatchingIndicesError();
        expect(error.output.payload).to.have.property('code', 'no_matching_indices');
      });
    });

    describe('isNoMatchingIndicesError()', () => {
      it('returns true for errors from createNoMatchingIndicesError()', () => {
        if (!isNoMatchingIndicesError(createNoMatchingIndicesError())) {
          throw new Error('Expected isNoMatchingIndicesError(createNoMatchingIndicesError()) to be true');
        }
      });

      it('returns false for indexNotFoundError', () => {
        if (isNoMatchingIndicesError(indexNotFoundError)) {
          throw new Error('expected isNoMatchingIndicesError(indexNotFoundError) to be false');
        }
      });

      it('returns false for docNotFoundError', async () => {
        if (isNoMatchingIndicesError(docNotFoundError)) {
          throw new Error('expected isNoMatchingIndicesError(docNotFoundError) to be false');
        }
      });
    });

    describe('convertEsError()', () => {
      const indices = ['foo', 'bar'];

      it('converts indexNotFoundErrors into NoMatchingIndices errors', async () => {
        const converted = convertEsError(indices, indexNotFoundError);
        if (!isNoMatchingIndicesError(converted)) {
          throw new Error('expected convertEsError(indexNotFoundError) to return NoMatchingIndices error');
        }
      });

      it('wraps other errors in Boom', async () => {
        const error = new esErrors.AuthenticationException({
          root_cause: [
            {
              type: 'security_exception',
              reason: 'action [indices:data/read/field_caps] is unauthorized for user [standard]'
            }
          ],
          type: 'security_exception',
          reason: 'action [indices:data/read/field_caps] is unauthorized for user [standard]'
        }, {
          statusCode: 403
        });

        expect(error).to.not.have.property('isBoom');
        const converted = convertEsError(indices, error);
        expect(converted).to.have.property('isBoom');
        expect(converted.output.statusCode).to.be(403);
      });
    });
  });
}
