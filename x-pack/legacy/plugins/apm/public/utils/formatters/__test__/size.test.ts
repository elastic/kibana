/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { getFixedByteFormatter, asDynamicBytes } from '../size';

describe('size formatters', () => {
  describe('byte formatting', () => {
    const bytes = 10;
    const kb = 1000 + 1;
    const mb = 1e6 + 1;
    const gb = 1e9 + 1;
    const tb = 1e12 + 1;

    test('dynamic', () => {
      expect(asDynamicBytes(bytes)).toEqual('10.0 B');
      expect(asDynamicBytes(kb)).toEqual('1.0 KB');
      expect(asDynamicBytes(mb)).toEqual('1.0 MB');
      expect(asDynamicBytes(gb)).toEqual('1.0 GB');
      expect(asDynamicBytes(tb)).toEqual('1.0 TB');
      expect(asDynamicBytes(null)).toEqual('');
      expect(asDynamicBytes(NaN)).toEqual('');
    });

    describe('fixed', () => {
      test('in bytes', () => {
        const formatInBytes = getFixedByteFormatter(bytes);
        expect(formatInBytes(bytes)).toEqual('10.0 B');
        expect(formatInBytes(kb)).toEqual('1,001.0 B');
        expect(formatInBytes(mb)).toEqual('1,000,001.0 B');
        expect(formatInBytes(gb)).toEqual('1,000,000,001.0 B');
        expect(formatInBytes(tb)).toEqual('1,000,000,000,001.0 B');
        expect(formatInBytes(null)).toEqual('');
        expect(formatInBytes(NaN)).toEqual('');
      });

      test('in kb', () => {
        const formatInKB = getFixedByteFormatter(kb);
        expect(formatInKB(bytes)).toEqual('0.0 KB');
        expect(formatInKB(kb)).toEqual('1.0 KB');
        expect(formatInKB(mb)).toEqual('1,000.0 KB');
        expect(formatInKB(gb)).toEqual('1,000,000.0 KB');
        expect(formatInKB(tb)).toEqual('1,000,000,000.0 KB');
      });

      test('in mb', () => {
        const formatInMB = getFixedByteFormatter(mb);
        expect(formatInMB(bytes)).toEqual('0.0 MB');
        expect(formatInMB(kb)).toEqual('0.0 MB');
        expect(formatInMB(mb)).toEqual('1.0 MB');
        expect(formatInMB(gb)).toEqual('1,000.0 MB');
        expect(formatInMB(tb)).toEqual('1,000,000.0 MB');
        expect(formatInMB(null)).toEqual('');
        expect(formatInMB(NaN)).toEqual('');
      });

      test('in gb', () => {
        const formatInGB = getFixedByteFormatter(gb);
        expect(formatInGB(bytes)).toEqual('1e-8 GB');
        expect(formatInGB(kb)).toEqual('0.0 GB');
        expect(formatInGB(mb)).toEqual('0.0 GB');
        expect(formatInGB(gb)).toEqual('1.0 GB');
        expect(formatInGB(tb)).toEqual('1,000.0 GB');
        expect(formatInGB(null)).toEqual('');
        expect(formatInGB(NaN)).toEqual('');
      });

      test('in tb', () => {
        const formatInTB = getFixedByteFormatter(tb);
        expect(formatInTB(bytes)).toEqual('1e-11 TB');
        expect(formatInTB(kb)).toEqual('1.001e-9 TB');
        expect(formatInTB(mb)).toEqual('0.0 TB');
        expect(formatInTB(gb)).toEqual('0.0 TB');
        expect(formatInTB(tb)).toEqual('1.0 TB');
        expect(formatInTB(null)).toEqual('');
        expect(formatInTB(NaN)).toEqual('');
      });
    });
  });
});
