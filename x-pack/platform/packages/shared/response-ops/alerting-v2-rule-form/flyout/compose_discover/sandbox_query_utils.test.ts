/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ensureComposedQuery,
  getYamlSandboxTabs,
  queryFromYamlToForm,
  resolveSandboxQueryOnApply,
  ruleQueryFromUnifiedEditorChange,
  shouldPreserveYamlSplitOnFormExit,
  shouldShowManualSplitToggle,
  shouldShowRecoverySandboxHeader,
  shouldShowSignalQueryHeader,
  shouldUseUnifiedSandboxEditor,
  toManualSplitQuery,
  toUnifiedSandboxQuery,
} from './sandbox_query_utils';

describe('toUnifiedSandboxQuery', () => {
  it('joins composed base and alert segment into a standalone breach query', () => {
    const result = toUnifiedSandboxQuery({
      format: 'composed',
      base: 'FROM logs-* | STATS c = COUNT(*) BY host',
      breach: { segment: '| WHERE c > 100' },
    });

    expect(result.format).toBe('standalone');
    expect(result).toMatchObject({
      breach: {
        query: 'FROM logs-* | STATS c = COUNT(*) BY host\n| WHERE c > 100',
      },
    });
  });
});

describe('toManualSplitQuery', () => {
  it('splits a threshold query into composed form', () => {
    const result = toManualSplitQuery(
      'FROM logs-* | STATS c = COUNT(*) BY host | WHERE c > 100'
    );

    expect(result.format).toBe('composed');
    expect(result.base).toContain('STATS');
    expect(result.breach.segment).toContain('WHERE c > 100');
  });

  it('allows apply without a WHERE clause (entire query becomes base)', () => {
    const result = toManualSplitQuery('FROM logs-* | STATS c = COUNT(*) BY host');

    expect(result.base).toContain('STATS');
    expect(result.breach.segment).toBe('');
  });
});

describe('shouldUseUnifiedSandboxEditor', () => {
  it('returns true on alert condition step for alert kind', () => {
    expect(shouldUseUnifiedSandboxEditor(true, 0, false, false, false)).toBe(true);
  });

  it('returns false when manual split is enabled', () => {
    expect(shouldUseUnifiedSandboxEditor(true, 0, false, false, true)).toBe(false);
  });

  it('returns false on recovery step', () => {
    expect(shouldUseUnifiedSandboxEditor(true, 1, false, false, false)).toBe(false);
  });

  it('returns false in yaml or builder mode', () => {
    expect(shouldUseUnifiedSandboxEditor(true, 0, true, false, false)).toBe(false);
    expect(shouldUseUnifiedSandboxEditor(true, 0, false, true, false)).toBe(false);
  });
});

describe('shouldShowSignalQueryHeader', () => {
  it('returns true on alert condition step for signal kind', () => {
    expect(shouldShowSignalQueryHeader(false, 0, false)).toBe(true);
  });

  it('returns false for alert kind', () => {
    expect(shouldShowSignalQueryHeader(true, 0, false)).toBe(false);
  });

  it('returns false on details step', () => {
    expect(shouldShowSignalQueryHeader(false, 1, false)).toBe(false);
  });

  it('returns false in builder mode', () => {
    expect(shouldShowSignalQueryHeader(false, 0, true)).toBe(false);
  });
});

describe('shouldShowManualSplitToggle', () => {
  it('returns true on alert condition step when query is committed and not in manual split', () => {
    expect(shouldShowManualSplitToggle(true, 0, false, false, false, true)).toBe(true);
  });

  it('returns false before the query is committed', () => {
    expect(shouldShowManualSplitToggle(true, 0, false, false, false, false)).toBe(false);
  });

  it('returns false when manual split is already enabled', () => {
    expect(shouldShowManualSplitToggle(true, 0, false, false, true, true)).toBe(false);
  });
});

describe('shouldShowRecoverySandboxHeader', () => {
  it('returns true on recovery step with custom recovery in form view', () => {
    expect(shouldShowRecoverySandboxHeader(true, 1, false, false, 'custom')).toBe(true);
  });

  it('returns false on alert condition step', () => {
    expect(shouldShowRecoverySandboxHeader(true, 0, false, false, 'custom')).toBe(false);
  });

  it('returns false with default recovery type', () => {
    expect(shouldShowRecoverySandboxHeader(true, 1, false, false, 'default')).toBe(false);
  });

  it('returns false in yaml mode', () => {
    expect(shouldShowRecoverySandboxHeader(true, 1, true, false, 'custom')).toBe(false);
  });
});

describe('ensureComposedQuery', () => {
  it('returns composed queries unchanged', () => {
    const query = {
      format: 'composed' as const,
      base: 'FROM logs-*',
      breach: { segment: '| WHERE c > 1' },
    };

    expect(ensureComposedQuery(query)).toBe(query);
  });

  it('splits standalone breach queries into composed form', () => {
    const result = ensureComposedQuery({
      format: 'standalone',
      breach: { query: 'FROM logs-* | STATS c = COUNT(*) BY host | WHERE c > 1' },
    });

    expect(result.base).toContain('STATS');
    expect(result.breach.segment).toContain('WHERE c > 1');
  });

  it('preserves recovery segment from standalone queries', () => {
    const result = ensureComposedQuery({
      format: 'standalone',
      breach: { query: 'FROM logs-* | STATS c = COUNT(*) BY host | WHERE c > 1' },
      recovery: { query: '| WHERE c < 50' },
    });

    expect(result.recovery?.segment).toBe('| WHERE c < 50');
  });
});

describe('getYamlSandboxTabs', () => {
  it('returns base and alert tabs by default', () => {
    expect(
      getYamlSandboxTabs({ format: 'standalone', breach: { query: 'FROM logs-*' } }, 'default')
    ).toEqual(['base', 'alert']);
  });

  it('includes recovery when recoveryType is custom', () => {
    expect(
      getYamlSandboxTabs({ format: 'standalone', breach: { query: 'FROM logs-*' } }, 'custom')
    ).toEqual(['base', 'alert', 'recovery']);
  });

  it('includes recovery when the query defines a recovery segment', () => {
    expect(
      getYamlSandboxTabs(
        {
          format: 'standalone',
          breach: { query: 'FROM logs-* | WHERE c > 1' },
          recovery: { query: '| WHERE c < 50' },
        },
        'default'
      )
    ).toEqual(['base', 'alert', 'recovery']);
  });
});

describe('resolveSandboxQueryOnApply', () => {
  const committedComposed = {
    format: 'composed' as const,
    base: 'FROM logs-* | STATS c = COUNT(*) BY host',
    breach: { segment: '| WHERE c > 100' },
  };

  it('splits unified standalone sandbox queries on alert apply', () => {
    const result = resolveSandboxQueryOnApply({
      sandboxQuery: {
        format: 'standalone',
        breach: { query: 'FROM logs-* | STATS c = COUNT(*) BY host | WHERE c > 100' },
      },
      committedQuery: { format: 'standalone', breach: { query: '' } },
      useUnified: true,
    });

    expect(result).toEqual(committedComposed);
  });

  it('preserves composed base and breach when recovery apply uses stale standalone sandbox state', () => {
    const result = resolveSandboxQueryOnApply({
      sandboxQuery: {
        format: 'standalone',
        breach: {
          query: 'FROM logs-* | STATS c = COUNT(*) BY host | WHERE c > 100',
        },
        recovery: { query: '| WHERE c < 50' },
      },
      committedQuery: committedComposed,
      useUnified: false,
    });

    expect(result).toEqual({
      ...committedComposed,
      recovery: { segment: '| WHERE c < 50' },
    });
  });
});

describe('shouldPreserveYamlSplitOnFormExit', () => {
  const yamlSplit = {
    format: 'composed' as const,
    base: 'FROM logs',
    breach: { segment: '| WHERE c > 1' },
  };

  it('returns true for alert rules with a composed YAML sandbox query', () => {
    expect(shouldPreserveYamlSplitOnFormExit(true, false, yamlSplit)).toBe(true);
  });

  it('returns false for signal rules or builder mode', () => {
    expect(shouldPreserveYamlSplitOnFormExit(false, false, yamlSplit)).toBe(false);
    expect(shouldPreserveYamlSplitOnFormExit(true, true, yamlSplit)).toBe(false);
  });

  it('returns false when the YAML sandbox query is standalone', () => {
    expect(
      shouldPreserveYamlSplitOnFormExit(true, false, {
        format: 'standalone',
        breach: { query: 'FROM logs' },
      })
    ).toBe(false);
  });
});

describe('queryFromYamlToForm', () => {
  const yamlSplit = {
    format: 'composed' as const,
    base: 'FROM logs | STATS c = COUNT(*)',
    breach: { segment: '| WHERE c > 100' },
  };

  it('keeps the YAML sandbox split instead of the parsed standalone query', () => {
    const parsedStandalone = {
      format: 'standalone' as const,
      breach: {
        query: 'FROM logs | STATS c = COUNT(*) | WHERE c > 100',
      },
    };

    expect(
      queryFromYamlToForm({
        parsedQuery: parsedStandalone,
        yamlSandboxQuery: yamlSplit,
        isAlertKind: true,
        isBuilderMode: false,
      })
    ).toEqual(yamlSplit);
  });

  it('returns the parsed query for signal rules', () => {
    const parsedStandalone = {
      format: 'standalone' as const,
      breach: { query: 'FROM logs' },
    };

    expect(
      queryFromYamlToForm({
        parsedQuery: parsedStandalone,
        yamlSandboxQuery: yamlSplit,
        isAlertKind: false,
        isBuilderMode: false,
      })
    ).toEqual(parsedStandalone);
  });
});

describe('ruleQueryFromUnifiedEditorChange', () => {
  it('stores the full editor text as standalone breach query', () => {
    const result = ruleQueryFromUnifiedEditorChange(
      {
        format: 'composed',
        base: 'FROM logs-* | STATS count = COUNT(*) BY host.name',
        breach: { segment: '| WHERE count > 100' },
      },
      'FROM logs-* | STATS count = COUNT(*) BY host.name\n| WHERE count > 200'
    );

    expect(result).toEqual({
      format: 'standalone',
      breach: {
        query: 'FROM logs-* | STATS count = COUNT(*) BY host.name\n| WHERE count > 200',
      },
    });
  });

  it('preserves recovery when converting composed sandbox state to standalone', () => {
    const result = ruleQueryFromUnifiedEditorChange(
      {
        format: 'composed',
        base: 'FROM logs-*',
        breach: { segment: '| WHERE count > 100' },
        recovery: { segment: '| WHERE count < 50' },
      },
      'FROM logs-* | WHERE count > 100'
    );

    expect(result).toEqual({
      format: 'standalone',
      breach: { query: 'FROM logs-* | WHERE count > 100' },
      recovery: { query: 'FROM logs-*\n| WHERE count < 50' },
    });
  });
});
