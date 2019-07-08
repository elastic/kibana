/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraWaffleMapDataFormat } from '../../lib/lib';
import { createDataFormatter } from './data';
describe('createDataFormatter', () => {
  it('should format bytes as bytesDecimal', () => {
    const formatter = createDataFormatter(InfraWaffleMapDataFormat.bytesDecimal);
    expect(formatter(1000000)).toBe('1MB');
  });
  it('should format bytes as bytesBinaryIEC', () => {
    const formatter = createDataFormatter(InfraWaffleMapDataFormat.bytesBinaryIEC);
    expect(formatter(1000000)).toBe('976.6Kib');
  });
  it('should format bytes as bytesBinaryJEDEC', () => {
    const formatter = createDataFormatter(InfraWaffleMapDataFormat.bytesBinaryJEDEC);
    expect(formatter(1000000)).toBe('976.6KB');
  });
  it('should format bytes as bitsDecimal', () => {
    const formatter = createDataFormatter(InfraWaffleMapDataFormat.bitsDecimal);
    expect(formatter(1000000)).toBe('8Mbit');
  });
  it('should format bytes as bitsBinaryIEC', () => {
    const formatter = createDataFormatter(InfraWaffleMapDataFormat.bitsBinaryIEC);
    expect(formatter(1000000)).toBe('7.6Mibit');
  });
  it('should format bytes as bitsBinaryJEDEC', () => {
    const formatter = createDataFormatter(InfraWaffleMapDataFormat.bitsBinaryJEDEC);
    expect(formatter(1000000)).toBe('7.6Mbit');
  });
  it('should format bytes as abbreviatedNumber', () => {
    const formatter = createDataFormatter(InfraWaffleMapDataFormat.abbreviatedNumber);
    expect(formatter(1000000)).toBe('1M');
  });
});
