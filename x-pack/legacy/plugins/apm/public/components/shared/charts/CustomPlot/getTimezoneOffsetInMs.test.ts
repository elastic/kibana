/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getTimezoneOffsetInMs } from './getTimezoneOffsetInMs';
import moment from 'moment-timezone';

describe('getTimezoneOffsetInMs', () => {
  describe('when no default timezone is set', () => {
    it('guesses the timezone', () => {
      const guess = jest.fn(() => 'Etc/UTC');
      jest.spyOn(moment.tz, 'guess').mockImplementationOnce(guess);

      getTimezoneOffsetInMs(Date.now());

      expect(guess).toHaveBeenCalled();
    });
  });

  describe('when a default timezone is set', () => {
    let originalTimezone: moment.MomentZone | null;

    beforeAll(() => {
      // @ts-ignore moment types do not define defaultZone but it's there
      originalTimezone = moment.defaultZone;
      moment.tz.setDefault('America/Denver');
    });

    afterAll(() => {
      moment.tz.setDefault(originalTimezone ? originalTimezone.name : '');
    });

    it('returns the time in milliseconds', () => {
      expect(getTimezoneOffsetInMs(Date.now())).toEqual(21600000);
    });
  });
});
