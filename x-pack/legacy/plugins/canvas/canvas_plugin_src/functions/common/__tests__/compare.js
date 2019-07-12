/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { compare } from '../compare';
import { functionWrapper } from '../../../../__tests__/helpers/function_wrapper';
import { getFunctionErrors } from '../../../strings';

const errors = getFunctionErrors().compare;

describe('compare', () => {
  const fn = functionWrapper(compare);

  describe('args', () => {
    describe('op', () => {
      it('sets the operator', () => {
        expect(fn(0, { op: 'lt', to: 1 })).to.be(true);
      });

      it("defaults to 'eq'", () => {
        expect(fn(0, { to: 1 })).to.be(false);
        expect(fn(0, { to: 0 })).to.be(true);
      });

      it('throws when invalid op is provided', () => {
        expect(() => fn(1, { op: 'boo', to: 2 })).to.throwException(
          new RegExp(errors.invalidCompareOperator('boo').message)
        );
        expect(() => fn(1, { op: 'boo' })).to.throwException(
          new RegExp(errors.invalidCompareOperator('boo').message)
        );
      });
    });

    describe('to', () => {
      it('sets the value that context is compared to', () => {
        expect(fn(0, { to: 1 })).to.be(false);
      });

      it('if not provided, ne returns true while every other operator returns false', () => {
        expect(fn(null, { op: 'ne' })).to.be(true);
        expect(fn(0, { op: 'ne' })).to.be(true);
        expect(fn(true, { op: 'lte' })).to.be(false);
        expect(fn(1, { op: 'gte' })).to.be(false);
        expect(fn('foo', { op: 'lt' })).to.be(false);
        expect(fn(null, { op: 'gt' })).to.be(false);
        expect(fn(null, { op: 'eq' })).to.be(false);
      });
    });
  });

  describe('same type comparisons', () => {
    describe('null', () => {
      it('returns true', () => {
        expect(fn(null, { op: 'eq', to: null })).to.be(true);
        expect(fn(null, { op: 'lte', to: null })).to.be(true);
        expect(fn(null, { op: 'gte', to: null })).to.be(true);
      });

      it('returns false', () => {
        expect(fn(null, { op: 'ne', to: null })).to.be(false);
        expect(fn(null, { op: 'lt', to: null })).to.be(false);
        expect(fn(null, { op: 'gt', to: null })).to.be(false);
      });
    });

    describe('number', () => {
      it('returns true', () => {
        expect(fn(-2.34, { op: 'lt', to: 10 })).to.be(true);
        expect(fn(2, { op: 'gte', to: 2 })).to.be(true);
      });

      it('returns false', () => {
        expect(fn(2, { op: 'eq', to: 10 })).to.be(false);
        expect(fn(10, { op: 'ne', to: 10 })).to.be(false);
        expect(fn(1, { op: 'lte', to: -3 })).to.be(false);
        expect(fn(2, { op: 'gt', to: 2 })).to.be(false);
      });
    });

    describe('string', () => {
      it('returns true', () => {
        expect(fn('foo', { op: 'gte', to: 'foo' })).to.be(true);
        expect(fn('foo', { op: 'lte', to: 'foo' })).to.be(true);
        expect(fn('bar', { op: 'lt', to: 'foo' })).to.be(true);
      });

      it('returns false', () => {
        expect(fn('foo', { op: 'eq', to: 'bar' })).to.be(false);
        expect(fn('foo', { op: 'ne', to: 'foo' })).to.be(false);
        expect(fn('foo', { op: 'gt', to: 'foo' })).to.be(false);
      });
    });

    describe('boolean', () => {
      it('returns true', () => {
        expect(fn(true, { op: 'eq', to: true })).to.be(true);
        expect(fn(false, { op: 'eq', to: false })).to.be(true);
        expect(fn(true, { op: 'ne', to: false })).to.be(true);
        expect(fn(false, { op: 'ne', to: true })).to.be(true);
      });
      it('returns false', () => {
        expect(fn(true, { op: 'eq', to: false })).to.be(false);
        expect(fn(false, { op: 'eq', to: true })).to.be(false);
        expect(fn(true, { op: 'ne', to: true })).to.be(false);
        expect(fn(false, { op: 'ne', to: false })).to.be(false);
      });
    });
  });

  describe('different type comparisons', () => {
    it("returns true for 'ne' only", () => {
      expect(fn(0, { op: 'ne', to: '0' })).to.be(true);
    });

    it('otherwise always returns false', () => {
      expect(fn(0, { op: 'eq', to: '0' })).to.be(false);
      expect(fn('foo', { op: 'lt', to: 10 })).to.be(false);
      expect(fn('foo', { op: 'lte', to: true })).to.be(false);
      expect(fn(0, { op: 'gte', to: null })).to.be(false);
      expect(fn(0, { op: 'eq', to: false })).to.be(false);
      expect(fn(true, { op: 'gte', to: null })).to.be(false);
    });
  });
});
