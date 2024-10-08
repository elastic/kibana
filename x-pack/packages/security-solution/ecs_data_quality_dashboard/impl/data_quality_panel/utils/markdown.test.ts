/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import numeral from '@elastic/numeral';

import { EMPTY_STAT } from '../constants';
import {
  getCodeFormattedValue,
  getHeaderSeparator,
  getMarkdownTableHeader,
  getResultEmoji,
  getStatsRollupMarkdownComment,
  getSummaryTableMarkdownHeader,
  getSummaryTableMarkdownRow,
} from './markdown';

const defaultBytesFormat = '0,0.[0]b';
const formatBytes = (value: number | undefined) =>
  value != null ? numeral(value).format(defaultBytesFormat) : EMPTY_STAT;

const defaultNumberFormat = '0,0.[000]';
const formatNumber = (value: number | undefined) =>
  value != null ? numeral(value).format(defaultNumberFormat) : EMPTY_STAT;

describe('getHeaderSeparator', () => {
  test('it returns a sequence of dashes equal to the length of the header, plus two additional dashes to pad each end of the cntent', () => {
    const content = '0123456789'; // content.length === 10
    const expected = '------------'; // expected.length === 12

    expect(getHeaderSeparator(content)).toEqual(expected);
  });
});

describe('getCodeFormattedValue', () => {
  test('it returns the expected placeholder when `value` is undefined', () => {
    expect(getCodeFormattedValue(undefined)).toEqual('`--`');
  });

  test('it returns the content formatted as markdown code', () => {
    const value = 'foozle';

    expect(getCodeFormattedValue(value)).toEqual('`foozle`');
  });

  test('it escapes content such that `value` may be included in a markdown table cell', () => {
    const value =
      '|\nthere were newlines and column separators in the beginning, middle,\n|and end|\n';

    expect(getCodeFormattedValue(value)).toEqual(
      '`\\| there were newlines and column separators in the beginning, middle, \\|and end\\| `'
    );
  });
});

describe('getStatsRollupMarkdownComment', () => {
  test('it returns the expected comment', () => {
    expect(
      getStatsRollupMarkdownComment({
        docsCount: 57410,
        formatBytes,
        formatNumber,
        incompatible: 3,
        indices: 25,
        indicesChecked: 1,
        sizeInBytes: 28413,
      })
    ).toEqual(
      '| Incompatible fields | Indices checked | Indices | Size | Docs |\n|---------------------|-----------------|---------|------|------|\n| 3 | 1 | 25 | 27.7KB | 57,410 |\n'
    );
  });

  test('it returns the expected comment when optional values are undefined', () => {
    expect(
      getStatsRollupMarkdownComment({
        docsCount: 0,
        formatBytes,
        formatNumber,
        incompatible: undefined,
        indices: undefined,
        indicesChecked: undefined,
        sizeInBytes: undefined,
      })
    ).toEqual(
      '| Incompatible fields | Indices checked | Indices | Docs |\n|---------------------|-----------------|---------|------|\n| -- | -- | -- | 0 |\n'
    );
  });
});

describe('getSummaryTableMarkdownHeader', () => {
  test('it returns the expected header', () => {
    const isILMAvailable = true;
    expect(getSummaryTableMarkdownHeader(isILMAvailable)).toEqual(
      '| Result | Index | Docs | Incompatible fields | ILM Phase | Size |\n|--------|-------|------|---------------------|-----------|------|'
    );
  });

  test('it returns the expected header when isILMAvailable is false', () => {
    const isILMAvailable = false;
    expect(getSummaryTableMarkdownHeader(isILMAvailable)).toEqual(
      '| Result | Index | Docs | Incompatible fields |\n|--------|-------|------|---------------------|'
    );
  });

  test('it returns the expected header when displayDocSize is false', () => {
    const isILMAvailable = false;
    expect(getSummaryTableMarkdownHeader(isILMAvailable)).toEqual(
      '| Result | Index | Docs | Incompatible fields |\n|--------|-------|------|---------------------|'
    );
  });
});

describe('getSummaryTableMarkdownRow', () => {
  test('it returns the expected row when all values are provided', () => {
    expect(
      getSummaryTableMarkdownRow({
        docsCount: 4,
        formatBytes,
        formatNumber,
        incompatible: 3,
        ilmPhase: 'unmanaged',
        isILMAvailable: true,
        indexName: 'auditbeat-custom-index-1',
        patternDocsCount: 57410,
        sizeInBytes: 28413,
      })
    ).toEqual('| ❌ | auditbeat-custom-index-1 | 4 (0.0%) | 3 | `unmanaged` | 27.7KB |\n');
  });

  test('it returns the expected row when optional values are NOT provided', () => {
    expect(
      getSummaryTableMarkdownRow({
        docsCount: 4,
        formatBytes,
        formatNumber,
        incompatible: undefined, // <--
        ilmPhase: undefined, // <--
        indexName: 'auditbeat-custom-index-1',
        isILMAvailable: true,
        patternDocsCount: 57410,
        sizeInBytes: 28413,
      })
    ).toEqual('| -- | auditbeat-custom-index-1 | 4 (0.0%) | -- | -- | 27.7KB |\n');
  });

  test('it returns the expected row when isILMAvailable is false', () => {
    expect(
      getSummaryTableMarkdownRow({
        docsCount: 4,
        formatBytes,
        formatNumber,
        incompatible: undefined, // <--
        ilmPhase: undefined, // <--
        indexName: 'auditbeat-custom-index-1',
        isILMAvailable: false,
        patternDocsCount: 57410,
        sizeInBytes: undefined,
      })
    ).toEqual('| -- | auditbeat-custom-index-1 | 4 (0.0%) | -- |\n');
  });

  test('it returns the expected row when sizeInBytes is undefined', () => {
    expect(
      getSummaryTableMarkdownRow({
        docsCount: 4,
        formatBytes,
        formatNumber,
        incompatible: undefined, // <--
        ilmPhase: undefined, // <--
        indexName: 'auditbeat-custom-index-1',
        isILMAvailable: false,
        patternDocsCount: 57410,
        sizeInBytes: undefined,
      })
    ).toEqual('| -- | auditbeat-custom-index-1 | 4 (0.0%) | -- |\n');
  });
});

describe('getResultEmoji', () => {
  test('it returns the expected placeholder when `incompatible` is undefined', () => {
    expect(getResultEmoji(undefined)).toEqual('--');
  });

  test('it returns a ✅ when the incompatible count is zero', () => {
    expect(getResultEmoji(0)).toEqual('✅');
  });

  test('it returns a ❌ when the incompatible count is NOT zero', () => {
    expect(getResultEmoji(1)).toEqual('❌');
  });
});

describe('getMarkdownTableHeader', () => {
  const headerNames = [
    '|\nthere were newlines and column separators in the beginning, middle,\n|and end|\n',
    'A second column',
    'A third column',
  ];

  test('it returns the expected table header', () => {
    expect(getMarkdownTableHeader(headerNames)).toEqual(
      '\n| \\| there were newlines and column separators in the beginning, middle, \\|and end\\|  | A second column | A third column | \n|----------------------------------------------------------------------------------|-----------------|----------------|'
    );
  });
});
