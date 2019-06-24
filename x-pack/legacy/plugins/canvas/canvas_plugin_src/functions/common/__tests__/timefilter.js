/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import sinon from 'sinon';
import { timefilter } from '../timefilter';
import { functionWrapper } from '../../../../__tests__/helpers/function_wrapper';
import { getFunctionErrors } from '../../../strings';
import { emptyFilter } from './fixtures/test_filters';

const errors = getFunctionErrors().timefilter;

let clock = null;

beforeEach(function() {
  clock = sinon.useFakeTimers();
});

afterEach(function() {
  clock.restore();
});

describe('timefilter', () => {
  const fn = functionWrapper(timefilter);
  const fromDate = '2018-02-06T15:00:00.950Z';
  const toDate = '2018-02-07T15:00:00.950Z';

  it('returns a filter', () => {
    expect(
      fn(emptyFilter, {
        column: 'time',
        from: fromDate,
        to: toDate,
      })
    ).to.have.property('type', 'filter');
  });

  it("adds a time object to 'and'", () => {
    expect(
      fn(emptyFilter, {
        column: 'time',
        from: fromDate,
        to: toDate,
      }).and[0]
    ).to.have.property('type', 'time');
  });

  describe('args', () => {
    it("returns the original context if neither 'from' nor 'to' is provided", () => {
      expect(fn(emptyFilter, { column: 'time' })).to.eql(emptyFilter);
    });

    describe('column', () => {
      it('sets the column to apply the filter to', () => {
        expect(fn(emptyFilter, { column: 'time', from: 'now' }).and[0]).to.have.property(
          'column',
          'time'
        );
      });

      it("defaults column to '@timestamp'", () => {
        expect(fn(emptyFilter, { from: 'now' }).and[0]).to.have.property('column', '@timestamp');
      });
    });

    describe('from', () => {
      it('sets the start date', () => {
        let result = fn(emptyFilter, { from: fromDate });
        expect(result.and[0]).to.have.property('from', fromDate);

        result = fn(emptyFilter, { from: 'now-5d' });
        const dateOffset = 24 * 60 * 60 * 1000 * 5; //5 days
        expect(result.and[0]).to.have.property(
          'from',
          new Date(new Date().getTime() - dateOffset).toISOString()
        );
      });
    });

    describe('to', () => {
      it('sets the end date', () => {
        let result = fn(emptyFilter, { to: toDate });
        expect(result.and[0]).to.have.property('to', toDate);

        result = fn(emptyFilter, { to: 'now' });
        expect(result.and[0]).to.have.property('to', new Date().toISOString());
      });

      it('throws when provided an invalid date string', () => {
        expect(() => fn(emptyFilter, { from: '2018-13-42T15:00:00.950Z' })).to.throwException(
          new RegExp(errors.invalidString('2018-13-42T15:00:00.950Z').message)
        );
      });
    });
  });
});
