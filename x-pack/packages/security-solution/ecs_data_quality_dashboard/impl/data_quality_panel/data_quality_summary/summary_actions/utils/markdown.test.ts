/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import numeral from '@elastic/numeral';

import { EMPTY_STAT } from '../../../constants';
import {
  auditbeatNoResults,
  auditbeatWithAllResults,
} from '../../../mock/pattern_rollup/mock_auditbeat_pattern_rollup';
import { INDEX } from '../../../translations';
import { ErrorSummary, PatternRollup } from '../../../types';
import { ERROR, ERRORS, PATTERN } from '../translations';
import {
  getDataQualitySummaryMarkdownComment,
  getErrorsMarkdownTable,
  getErrorsMarkdownTableRows,
  getIlmExplainPhaseCountsMarkdownComment,
  getPatternSummaryMarkdownComment,
} from './markdown';

const defaultBytesFormat = '0,0.[0]b';
const formatBytes = (value: number | undefined) =>
  value != null ? numeral(value).format(defaultBytesFormat) : EMPTY_STAT;

const defaultNumberFormat = '0,0.[000]';
const formatNumber = (value: number | undefined) =>
  value != null ? numeral(value).format(defaultNumberFormat) : EMPTY_STAT;

describe('getIlmExplainPhaseCountsMarkdownComment', () => {
  test('it returns the expected comment when _all_ of the counts are greater than zero', () => {
    expect(
      getIlmExplainPhaseCountsMarkdownComment({
        hot: 99,
        warm: 8,
        unmanaged: 77,
        cold: 6,
        frozen: 55,
      })
    ).toEqual('`hot(99)` `warm(8)` `unmanaged(77)` `cold(6)` `frozen(55)`');
  });

  test('it returns the expected comment when _some_ of the counts are greater than zero', () => {
    expect(
      getIlmExplainPhaseCountsMarkdownComment({
        hot: 9,
        warm: 0,
        unmanaged: 2,
        cold: 1,
        frozen: 0,
      })
    ).toEqual('`hot(9)` `unmanaged(2)` `cold(1)`');
  });

  test('it returns the expected comment when _none_ of the counts are greater than zero', () => {
    expect(
      getIlmExplainPhaseCountsMarkdownComment({
        hot: 0,
        warm: 0,
        unmanaged: 0,
        cold: 0,
        frozen: 0,
      })
    ).toEqual('');
  });
});

describe('getPatternSummaryMarkdownComment', () => {
  test('it returns the expected comment when the rollup contains results for all of the indices in the pattern', () => {
    expect(
      getPatternSummaryMarkdownComment({
        formatBytes,
        formatNumber,
        patternRollup: auditbeatWithAllResults,
      })
    ).toEqual(
      '## auditbeat-*\n`hot(1)` `unmanaged(2)`\n\n| Incompatible fields | Indices checked | Indices | Size | Docs |\n|---------------------|-----------------|---------|------|------|\n| 4 | 3 | 3 | 17.9MB | 19,127 |\n\n'
    );
  });

  test('it returns the expected comment when the rollup contains no results', () => {
    expect(
      getPatternSummaryMarkdownComment({
        formatBytes,
        formatNumber,
        patternRollup: auditbeatNoResults,
      })
    ).toEqual(
      '## auditbeat-*\n`hot(1)` `unmanaged(2)`\n\n| Incompatible fields | Indices checked | Indices | Size | Docs |\n|---------------------|-----------------|---------|------|------|\n| -- | 0 | 3 | 17.9MB | 19,127 |\n\n'
    );
  });

  test('it returns the expected comment when the rollup does NOT have `ilmExplainPhaseCounts`', () => {
    const noIlmExplainPhaseCounts: PatternRollup = {
      ...auditbeatWithAllResults,
      ilmExplainPhaseCounts: undefined, // <--
    };

    expect(
      getPatternSummaryMarkdownComment({
        formatBytes,
        formatNumber,
        patternRollup: noIlmExplainPhaseCounts,
      })
    ).toEqual(
      '## auditbeat-*\n\n\n| Incompatible fields | Indices checked | Indices | Size | Docs |\n|---------------------|-----------------|---------|------|------|\n| 4 | 3 | 3 | 17.9MB | 19,127 |\n\n'
    );
  });

  test('it returns the expected comment when `docsCount` is undefined', () => {
    const noDocsCount: PatternRollup = {
      ...auditbeatWithAllResults,
      docsCount: undefined, // <--
    };

    expect(
      getPatternSummaryMarkdownComment({
        formatBytes,
        formatNumber,
        patternRollup: noDocsCount,
      })
    ).toEqual(
      '## auditbeat-*\n`hot(1)` `unmanaged(2)`\n\n| Incompatible fields | Indices checked | Indices | Size | Docs |\n|---------------------|-----------------|---------|------|------|\n| 4 | 3 | 3 | 17.9MB | 0 |\n\n'
    );
  });
});

describe('getDataQualitySummaryMarkdownComment', () => {
  test('it returns the expected comment', () => {
    expect(
      getDataQualitySummaryMarkdownComment({
        formatBytes,
        formatNumber,
        totalDocsCount: 3343719,
        totalIncompatible: 4,
        totalIndices: 30,
        totalIndicesChecked: 2,
        sizeInBytes: 4294967296,
      })
    ).toEqual(
      '# Data quality\n\n| Incompatible fields | Indices checked | Indices | Size | Docs |\n|---------------------|-----------------|---------|------|------|\n| 4 | 2 | 30 | 4GB | 3,343,719 |\n\n'
    );
  });

  test('it returns the expected comment when optional values are undefined', () => {
    expect(
      getDataQualitySummaryMarkdownComment({
        formatBytes,
        formatNumber,
        totalDocsCount: undefined,
        totalIncompatible: undefined,
        totalIndices: undefined,
        totalIndicesChecked: undefined,
        sizeInBytes: undefined,
      })
    ).toEqual(
      '# Data quality\n\n| Incompatible fields | Indices checked | Indices | Docs |\n|---------------------|-----------------|---------|------|\n| -- | -- | -- | 0 |\n\n'
    );
  });
});

const errorSummary: ErrorSummary[] = [
  {
    pattern: '.alerts-security.alerts-default',
    indexName: null,
    error: 'Error loading stats: Error: Forbidden',
  },
  {
    error:
      'Error: Error loading unallowed values for index auditbeat-7.2.1-2023.02.13-000001: Forbidden',
    indexName: 'auditbeat-7.2.1-2023.02.13-000001',
    pattern: 'auditbeat-*',
  },
];

describe('getErrorsMarkdownTableRows', () => {
  test('it returns the expected markdown table rows', () => {
    expect(getErrorsMarkdownTableRows(errorSummary)).toEqual(
      '| .alerts-security.alerts-default | -- | `Error loading stats: Error: Forbidden` |\n| auditbeat-* | auditbeat-7.2.1-2023.02.13-000001 | `Error: Error loading unallowed values for index auditbeat-7.2.1-2023.02.13-000001: Forbidden` |'
    );
  });
});

describe('getErrorsMarkdownTable', () => {
  test('it returns the expected table contents', () => {
    expect(
      getErrorsMarkdownTable({
        errorSummary,
        getMarkdownTableRows: getErrorsMarkdownTableRows,
        headerNames: [PATTERN, INDEX, ERROR],
        title: ERRORS,
      })
    ).toEqual(
      `## Errors\n\nSome indices were not checked for Data Quality\n\nErrors may occur when pattern or index metadata is temporarily unavailable, or because you don't have the privileges required for access\n\nThe following privileges are required to check an index:\n- \`monitor\` or \`manage\`\n- \`view_index_metadata\`\n- \`read\`\n\n\n| Pattern | Index | Error | \n|---------|-------|-------|\n| .alerts-security.alerts-default | -- | \`Error loading stats: Error: Forbidden\` |\n| auditbeat-* | auditbeat-7.2.1-2023.02.13-000001 | \`Error: Error loading unallowed values for index auditbeat-7.2.1-2023.02.13-000001: Forbidden\` |\n`
    );
  });

  test('it returns an empty string when the error summary is empty', () => {
    expect(
      getErrorsMarkdownTable({
        errorSummary: [], // <-- empty
        getMarkdownTableRows: getErrorsMarkdownTableRows,
        headerNames: [PATTERN, INDEX, ERROR],
        title: ERRORS,
      })
    ).toEqual('');
  });
});
