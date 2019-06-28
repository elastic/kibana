/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import sinon from 'sinon';
import { date } from '../date';
import { functionWrapper } from '../../../../__tests__/helpers/function_wrapper';
import { getFunctionErrors } from '../../../strings';

const errors = getFunctionErrors().date;

describe('date', () => {
  const fn = functionWrapper(date);

  let clock;
  // stubbed date constructor to check current dates match when no args are passed in
  beforeEach(() => {
    clock = sinon.useFakeTimers();
  });

  afterEach(() => {
    clock.restore();
  });

  it('returns a date in ms from a date string with the provided format', () => {
    expect(fn(null, { value: '20111031', format: 'YYYYMMDD' })).to.be(1320019200000);
  });

  describe('args', () => {
    describe('value', () => {
      it('sets the date string to convert into ms', () => {
        expect(fn(null, { value: '2011-10-05T14:48:00.000Z' })).to.be(1317826080000);
      });

      it('defaults to current date (ms)', () => {
        expect(fn(null)).to.be(new Date().valueOf());
      });
    });

    describe('format', () => {
      it('sets the format to parse the date string', () => {
        expect(fn(null, { value: '20111031', format: 'YYYYMMDD' })).to.be(1320019200000);
      });

      it('defaults to ISO 8601 format', () => {
        expect(fn(null, { value: '2011-10-05T14:48:00.000Z' })).to.be(1317826080000);
      });

      it('throws when passing an invalid date string and format is not specified', () => {
        expect(() => fn(null, { value: '23/25/2014' })).to.throwException(
          new RegExp(errors.invalidDateInput('23/25/2014').message)
        );
      });
    });
  });
});
