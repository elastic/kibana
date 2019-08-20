/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import sinon from 'sinon';
import moment from 'moment';
import { constants } from '../../constants';
import { indexTimestamp } from '../../helpers/index_timestamp';

const anchor = '2016-04-02T01:02:03.456'; // saturday

describe('Index timestamp interval', function () {
  describe('construction', function () {
    it('should throw given an invalid interval', function () {
      const init = () => indexTimestamp('bananas');
      expect(init).to.throwException(/invalid.+interval/i);
    });
  });

  describe('timestamps', function () {
    let clock;
    let separator;

    beforeEach(function () {
      separator = constants.DEFAULT_SETTING_DATE_SEPARATOR;
      clock = sinon.useFakeTimers(moment(anchor).valueOf());
    });

    afterEach(function () {
      clock.restore();
    });

    describe('formats', function () {
      it('should return the year', function () {
        const timestamp = indexTimestamp('year');
        const str = `2016`;
        expect(timestamp).to.equal(str);
      });

      it('should return the year and month', function () {
        const timestamp = indexTimestamp('month');
        const str = `2016${separator}04`;
        expect(timestamp).to.equal(str);
      });

      it('should return the year, month, and first day of the week', function () {
        const timestamp = indexTimestamp('week');
        const str = `2016${separator}03${separator}27`;
        expect(timestamp).to.equal(str);
      });

      it('should return the year, month, and day of the week', function () {
        const timestamp = indexTimestamp('day');
        const str = `2016${separator}04${separator}02`;
        expect(timestamp).to.equal(str);
      });

      it('should return the year, month, day and hour', function () {
        const timestamp = indexTimestamp('hour');
        const str = `2016${separator}04${separator}02${separator}01`;
        expect(timestamp).to.equal(str);
      });

      it('should return the year, month, day, hour and minute', function () {
        const timestamp = indexTimestamp('minute');
        const str = `2016${separator}04${separator}02${separator}01${separator}02`;
        expect(timestamp).to.equal(str);
      });
    });

    describe('date separator', function () {
      it('should be customizable', function () {
        const separators = ['-', '.', '_'];
        separators.forEach(customSep => {
          const str = `2016${customSep}04${customSep}02${customSep}01${customSep}02`;
          const timestamp = indexTimestamp('minute', customSep);
          expect(timestamp).to.equal(str);
        });
      });

      it('should throw if a letter is used', function () {
        const separators = ['a', 'B', 'YYYY'];
        separators.forEach(customSep => {
          const fn = () => indexTimestamp('minute', customSep);
          expect(fn).to.throwException();
        });
      });
    });
  });
});
