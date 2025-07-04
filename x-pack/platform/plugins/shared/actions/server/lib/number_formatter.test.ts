/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { formatNumber } from './number_formatter';

const logger = loggingSystemMock.create().get();

describe('formatNumber()', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('using defaults is successful', () => {
    expect(formatNumber(logger, '1;;')).toMatchInlineSnapshot(`"1"`);
  });

  it('error cases handled', () => {
    expect(formatNumber(logger, '1')).toEqual(`invalid format, missing semicolons: '1'`);
    expect(logger.warn).toHaveBeenCalledWith(
      `mustache render error: invalid format, missing semicolons: '1'`
    );

    expect(formatNumber(logger, 'nope;;')).toEqual(`invalid number: 'nope'`);
    expect(logger.warn).toHaveBeenCalledWith(`mustache render error: invalid number: 'nope'`);

    expect(formatNumber(logger, '1;; nah')).toEqual(
      `invalid options: missing colon in option: 'nah'`
    );
    expect(logger.warn).toHaveBeenCalledWith(
      `mustache render error: invalid options: missing colon in option: 'nah'`
    );

    expect(formatNumber(logger, '1;; minimumIntegerDigits: N.O.')).toEqual(
      'error formatting number: minimumIntegerDigits value is out of range.'
    );
    expect(logger.warn).toHaveBeenCalledWith(
      `mustache render error: error formatting number: minimumIntegerDigits value is out of range.`
    );

    expect(formatNumber(logger, '1;; compactDisplay: uhuh')).toEqual(
      'error formatting number: Value uhuh out of range for Intl.NumberFormat options property compactDisplay'
    );
    expect(logger.warn).toHaveBeenCalledWith(
      `mustache render error: error formatting number: Value uhuh out of range for Intl.NumberFormat options property compactDisplay`
    );
  });

  it('using locales is successful', () => {
    expect(formatNumber(logger, '1000; de-DE;')).toMatchInlineSnapshot(`"1.000"`);
  });

  it('option compactDisplay is successful', () => {
    expect(
      formatNumber(logger, ' 1000;; notation: compact, compactDisplay: short, ')
    ).toMatchInlineSnapshot(`"1K"`);
  });

  it('option currency is successful', () => {
    expect(formatNumber(logger, '1000;; currency: EUR, style: currency')).toMatchInlineSnapshot(
      `"€1,000.00"`
    );
  });

  it('option currencyDisplay is successful', () => {
    expect(
      formatNumber(logger, '1000;; currency: EUR, style: currency, currencyDisplay: name')
    ).toMatchInlineSnapshot(`"1,000.00 euros"`);
  });

  it('option currencySign is successful', () => {
    expect(
      formatNumber(logger, '-1;; currency: EUR, style: currency, currencySign: accounting')
    ).toMatchInlineSnapshot(`"(€1.00)"`);
  });

  // not sure how to test this, and probably doesn't matter
  // because we default to en-US, and generally don't have
  // control over the server's locale
  it.skip('option localeMatcher is successful', () => {});

  it('option notation is successful', () => {
    expect(formatNumber(logger, '1000;; notation: engineering')).toMatchInlineSnapshot(`"1E3"`);
  });

  it('option numberingSystem is successful', () => {
    expect(formatNumber(logger, '1;; numberingSystem: fullwide')).toMatchInlineSnapshot(`"１"`);
  });

  it('option signDisplay is successful', () => {
    expect(formatNumber(logger, '1;; signDisplay: always')).toMatchInlineSnapshot(`"+1"`);
  });

  it('option style is successful', () => {
    expect(formatNumber(logger, '1;; style: percent')).toMatchInlineSnapshot(`"100%"`);
  });

  it('option unit is successful', () => {
    expect(formatNumber(logger, '1;; style: unit, unit: acre-per-liter')).toMatchInlineSnapshot(
      `"1 ac/L"`
    );
  });

  it('option unitDisplay is successful', () => {
    expect(
      formatNumber(logger, '1;; style: unit, unit: petabyte, unitDisplay: narrow')
    ).toMatchInlineSnapshot(`"1PB"`);
  });

  it('option useGrouping is successful', () => {
    expect(formatNumber(logger, '1000;; useGrouping: true ')).toMatchInlineSnapshot(`"1,000"`);
    expect(formatNumber(logger, '1000;; useGrouping: false')).toMatchInlineSnapshot(`"1000"`);
  });

  // not yet supported in node.js
  it.skip('option roundingMode is successful', () => {});

  // not yet supported in node.js
  it.skip('option roundingPriority is successful', () => {});

  // not yet supported in node.js
  it.skip('option roundingIncrement is successful', () => {});

  // not yet supported in node.js
  it.skip('option trailingZeroDisplay is successful', () => {});

  it('option minimumIntegerDigits is successful', () => {
    expect(formatNumber(logger, '1;; minimumIntegerDigits: 7')).toMatchInlineSnapshot(
      `"0,000,001"`
    );
  });

  it('option minimumFractionDigits is successful', () => {
    expect(formatNumber(logger, '1;; minimumFractionDigits: 3')).toMatchInlineSnapshot(`"1.000"`);
  });

  it('option maximumFractionDigits is successful', () => {
    expect(formatNumber(logger, '1.234;; maximumFractionDigits: 2')).toMatchInlineSnapshot(
      `"1.23"`
    );
  });

  it('option minimumSignificantDigits is successful', () => {
    expect(formatNumber(logger, '1;; minimumSignificantDigits: 3')).toMatchInlineSnapshot(`"1.00"`);
  });

  it('option maximumSignificantDigits is successful', () => {
    expect(formatNumber(logger, '123456;; maximumSignificantDigits: 4')).toMatchInlineSnapshot(
      `"123,500"`
    );
  });
});
