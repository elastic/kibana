/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiScreenReaderOnly, EuiTableFieldDataColumnType } from '@elastic/eui';
import numeral from '@elastic/numeral';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { omit } from 'lodash/fp';
import React from 'react';

import { TestProviders } from '../../mock/test_providers/test_providers';
import { EMPTY_STAT } from '../../helpers';
import {
  getDocsCountPercent,
  getResultIcon,
  getResultIconColor,
  getResultToolTip,
  getShowPagination,
  getSummaryTableColumns,
  getSummaryTableILMPhaseColumn,
  getSummaryTableSizeInBytesColumn,
  getToggleButtonId,
  IndexSummaryTableItem,
} from './helpers';
import { COLLAPSE, EXPAND, FAILED, PASSED, THIS_INDEX_HAS_NOT_BEEN_CHECKED } from './translations';

const defaultBytesFormat = '0,0.[0]b';
const formatBytes = (value: number | undefined) =>
  value != null ? numeral(value).format(defaultBytesFormat) : EMPTY_STAT;

const defaultNumberFormat = '0,0.[000]';
const formatNumber = (value: number | undefined) =>
  value != null ? numeral(value).format(defaultNumberFormat) : EMPTY_STAT;

describe('helpers', () => {
  describe('getResultToolTip', () => {
    test('it shows a "this index has not been checked" tool tip when `incompatible` is undefined', () => {
      expect(getResultToolTip(undefined)).toEqual(THIS_INDEX_HAS_NOT_BEEN_CHECKED);
    });

    test('it returns Passed when `incompatible` is zero', () => {
      expect(getResultToolTip(0)).toEqual(PASSED);
    });

    test('it returns Failed when `incompatible` is NOT zero', () => {
      expect(getResultToolTip(1)).toEqual(FAILED);
    });
  });

  describe('getResultIconColor', () => {
    test('it returns `ghost` when `incompatible` is undefined', () => {
      expect(getResultIconColor(undefined)).toEqual('ghost');
    });

    test('it returns `success` when `incompatible` is zero', () => {
      expect(getResultIconColor(0)).toEqual('success');
    });

    test('it returns `danger` when `incompatible` is NOT zero', () => {
      expect(getResultIconColor(1)).toEqual('danger');
    });
  });

  describe('getResultIcon', () => {
    test('it returns `cross` when `incompatible` is undefined', () => {
      expect(getResultIcon(undefined)).toEqual('cross');
    });

    test('it returns `check` when `incompatible` is zero', () => {
      expect(getResultIcon(0)).toEqual('check');
    });

    test('it returns `cross` when `incompatible` is NOT zero', () => {
      expect(getResultIcon(1)).toEqual('cross');
    });
  });

  describe('getDocsCountPercent', () => {
    test('it returns an empty string when `patternDocsCount` is zero', () => {
      expect(
        getDocsCountPercent({
          docsCount: 0,
          patternDocsCount: 0,
        })
      ).toEqual('');
    });

    test('it returns the expected format when when `patternDocsCount` is non-zero, and `locales` is undefined', () => {
      expect(
        getDocsCountPercent({
          docsCount: 2904,
          locales: undefined,
          patternDocsCount: 57410,
        })
      ).toEqual('5.1%');
    });

    test('it returns the expected format when when `patternDocsCount` is non-zero, and `locales` is provided', () => {
      expect(
        getDocsCountPercent({
          docsCount: 2904,
          locales: 'en-US',
          patternDocsCount: 57410,
        })
      ).toEqual('5.1%');
    });
  });

  describe('getToggleButtonId', () => {
    test('it returns the expected id when the button is expanded', () => {
      expect(
        getToggleButtonId({
          indexName: 'auditbeat-custom-index-1',
          isExpanded: true,
          pattern: 'auditbeat-*',
        })
      ).toEqual('collapseauditbeat-custom-index-1auditbeat-*');
    });

    test('it returns the expected id when the button is collapsed', () => {
      expect(
        getToggleButtonId({
          indexName: 'auditbeat-custom-index-1',
          isExpanded: false,
          pattern: 'auditbeat-*',
        })
      ).toEqual('expandauditbeat-custom-index-1auditbeat-*');
    });
  });

  describe('getSummaryTableColumns', () => {
    const indexName = '.ds-auditbeat-8.6.1-2023.02.07-000001';
    const isILMAvailable = true;

    const indexSummaryTableItem: IndexSummaryTableItem = {
      indexName,
      docsCount: 2796,
      incompatible: undefined,
      ilmPhase: 'hot',
      pattern: 'auditbeat-*',
      patternDocsCount: 57410,
      sizeInBytes: 103344068,
      checkedAt: Date.now(),
    };

    const hasIncompatible: IndexSummaryTableItem = {
      ...indexSummaryTableItem,
      incompatible: 1, // <-- one incompatible field
    };

    test('it returns the expected column configuration', () => {
      const columns = getSummaryTableColumns({
        formatBytes,
        formatNumber,
        itemIdToExpandedRowMap: {},
        isILMAvailable,
        pattern: 'auditbeat-*',
        toggleExpanded: jest.fn(),
      }).map((x) => omit('render', x));

      expect(columns).toEqual([
        {
          align: 'right',
          isExpander: true,
          name: (
            <EuiScreenReaderOnly>
              <span>{'Expand rows'}</span>
            </EuiScreenReaderOnly>
          ),
          width: '40px',
        },
        {
          field: 'incompatible',
          name: 'Result',
          sortable: true,
          truncateText: false,
          width: '65px',
        },
        { field: 'indexName', name: 'Index', sortable: true, truncateText: false, width: '300px' },
        { field: 'docsCount', name: 'Docs', sortable: true, truncateText: false },
        {
          field: 'incompatible',
          name: 'Incompatible fields',
          sortable: true,
          truncateText: false,
        },
        { field: 'ilmPhase', name: 'ILM Phase', sortable: true, truncateText: false },
        { field: 'sizeInBytes', name: 'Size', sortable: true, truncateText: false },
        { field: 'checkedAt', name: 'Last check', sortable: true, truncateText: false },
      ]);
    });

    describe('expand rows render()', () => {
      test('it renders an Expand button when the row is NOT expanded', () => {
        const columns = getSummaryTableColumns({
          formatBytes,
          formatNumber,
          itemIdToExpandedRowMap: {},
          isILMAvailable,
          pattern: 'auditbeat-*',
          toggleExpanded: jest.fn(),
        });
        const expandRowsRender = (columns[0] as EuiTableFieldDataColumnType<IndexSummaryTableItem>)
          .render;

        render(
          <TestProviders>
            {expandRowsRender != null &&
              expandRowsRender(indexSummaryTableItem, indexSummaryTableItem)}
          </TestProviders>
        );

        expect(screen.getByLabelText(EXPAND)).toBeInTheDocument();
      });

      test('it renders a Collapse button when the row is expanded', () => {
        const itemIdToExpandedRowMap: Record<string, React.ReactNode> = {
          [indexName]: () => null,
        };

        const columns = getSummaryTableColumns({
          formatBytes,
          formatNumber,
          itemIdToExpandedRowMap,
          isILMAvailable,
          pattern: 'auditbeat-*',
          toggleExpanded: jest.fn(),
        });
        const expandRowsRender = (columns[0] as EuiTableFieldDataColumnType<IndexSummaryTableItem>)
          .render;

        render(
          <TestProviders>
            {expandRowsRender != null &&
              expandRowsRender(indexSummaryTableItem, indexSummaryTableItem)}
          </TestProviders>
        );

        expect(screen.getByLabelText(COLLAPSE)).toBeInTheDocument();
      });

      test('it invokes the `toggleExpanded` with the index name when the button is clicked', () => {
        const toggleExpanded = jest.fn();

        const columns = getSummaryTableColumns({
          formatBytes,
          formatNumber,
          itemIdToExpandedRowMap: {},
          isILMAvailable,
          pattern: 'auditbeat-*',
          toggleExpanded,
        });
        const expandRowsRender = (columns[0] as EuiTableFieldDataColumnType<IndexSummaryTableItem>)
          .render;

        render(
          <TestProviders>
            {expandRowsRender != null &&
              expandRowsRender(indexSummaryTableItem, indexSummaryTableItem)}
          </TestProviders>
        );

        const button = screen.getByLabelText(EXPAND);
        userEvent.click(button);

        expect(toggleExpanded).toBeCalledWith(indexName);
      });
    });

    describe('incompatible render()', () => {
      test('it renders a placeholder when incompatible is undefined', () => {
        const incompatibleIsUndefined: IndexSummaryTableItem = {
          ...indexSummaryTableItem,
          incompatible: undefined, // <--
        };

        const columns = getSummaryTableColumns({
          formatBytes,
          formatNumber,
          itemIdToExpandedRowMap: {},
          isILMAvailable,
          pattern: 'auditbeat-*',
          toggleExpanded: jest.fn(),
        });
        const incompatibleRender = (
          columns[1] as EuiTableFieldDataColumnType<IndexSummaryTableItem>
        ).render;

        render(
          <TestProviders>
            {incompatibleRender != null &&
              incompatibleRender(incompatibleIsUndefined, incompatibleIsUndefined)}
          </TestProviders>
        );

        expect(screen.getByTestId('incompatiblePlaceholder')).toHaveTextContent(EMPTY_STAT);
      });

      test('it renders the expected icon when there are incompatible fields', () => {
        const columns = getSummaryTableColumns({
          formatBytes,
          formatNumber,
          itemIdToExpandedRowMap: {},
          isILMAvailable,
          pattern: 'auditbeat-*',
          toggleExpanded: jest.fn(),
        });
        const incompatibleRender = (
          columns[1] as EuiTableFieldDataColumnType<IndexSummaryTableItem>
        ).render;

        render(
          <TestProviders>
            {incompatibleRender != null && incompatibleRender(hasIncompatible, hasIncompatible)}
          </TestProviders>
        );

        expect(screen.getByTestId('resultIcon')).toHaveAttribute('data-euiicon-type', 'cross');
      });

      test('it renders the expected icon when there are zero fields', () => {
        const zeroIncompatible: IndexSummaryTableItem = {
          ...indexSummaryTableItem,
          incompatible: 0, // <-- one incompatible field
        };

        const columns = getSummaryTableColumns({
          formatBytes,
          formatNumber,
          itemIdToExpandedRowMap: {},
          isILMAvailable,
          pattern: 'auditbeat-*',
          toggleExpanded: jest.fn(),
        });
        const incompatibleRender = (
          columns[1] as EuiTableFieldDataColumnType<IndexSummaryTableItem>
        ).render;

        render(
          <TestProviders>
            {incompatibleRender != null && incompatibleRender(zeroIncompatible, zeroIncompatible)}
          </TestProviders>
        );

        expect(screen.getByTestId('resultIcon')).toHaveAttribute('data-euiicon-type', 'check');
      });
    });

    describe('indexName render()', () => {
      test('it renders the index name', () => {
        const columns = getSummaryTableColumns({
          formatBytes,
          formatNumber,
          itemIdToExpandedRowMap: {},
          isILMAvailable,
          pattern: 'auditbeat-*',
          toggleExpanded: jest.fn(),
        });
        const indexNameRender = (columns[2] as EuiTableFieldDataColumnType<IndexSummaryTableItem>)
          .render;

        render(
          <TestProviders>
            {indexNameRender != null &&
              indexNameRender(indexSummaryTableItem, indexSummaryTableItem)}
          </TestProviders>
        );

        expect(screen.getByTestId('indexName')).toHaveTextContent(indexName);
      });
    });

    describe('docsCount render()', () => {
      beforeEach(() => {
        const columns = getSummaryTableColumns({
          formatBytes,
          formatNumber,
          itemIdToExpandedRowMap: {},
          isILMAvailable,
          pattern: 'auditbeat-*',
          toggleExpanded: jest.fn(),
        });
        const docsCountRender = (columns[3] as EuiTableFieldDataColumnType<IndexSummaryTableItem>)
          .render;

        render(
          <TestProviders>
            {docsCountRender != null && docsCountRender(hasIncompatible, hasIncompatible)}
          </TestProviders>
        );
      });

      test('it renders the expected value', () => {
        expect(screen.getByTestId('docsCount')).toHaveAttribute(
          'value',
          String(hasIncompatible.docsCount)
        );
      });

      test('it renders the expected max (progress)', () => {
        expect(screen.getByTestId('docsCount')).toHaveAttribute(
          'max',
          String(hasIncompatible.patternDocsCount)
        );
      });
    });

    describe('incompatible column render()', () => {
      test('it renders the expected value', () => {
        const columns = getSummaryTableColumns({
          formatBytes,
          formatNumber,
          itemIdToExpandedRowMap: {},
          isILMAvailable,
          pattern: 'auditbeat-*',
          toggleExpanded: jest.fn(),
        });
        const incompatibleRender = (
          columns[4] as EuiTableFieldDataColumnType<IndexSummaryTableItem>
        ).render;

        render(
          <TestProviders>
            {incompatibleRender != null && incompatibleRender(hasIncompatible, hasIncompatible)}
          </TestProviders>
        );

        expect(screen.getByTestId('incompatibleStat')).toHaveTextContent('1');
      });

      test('it renders the expected placeholder when incompatible is undefined', () => {
        const columns = getSummaryTableColumns({
          formatBytes,
          formatNumber,
          itemIdToExpandedRowMap: {},
          isILMAvailable,
          pattern: 'auditbeat-*',
          toggleExpanded: jest.fn(),
        });
        const incompatibleRender = (
          columns[4] as EuiTableFieldDataColumnType<IndexSummaryTableItem>
        ).render;

        render(
          <TestProviders>
            {incompatibleRender != null &&
              incompatibleRender(indexSummaryTableItem, indexSummaryTableItem)}
          </TestProviders>
        );

        expect(screen.getByTestId('incompatibleStat')).toHaveTextContent('--');
      });
    });

    describe('getSummaryTableILMPhaseColumn', () => {
      test('it returns the expected column configuration when `isILMAvailable` is true', () => {
        const column = getSummaryTableILMPhaseColumn(isILMAvailable);
        expect(column.length).toEqual(1);
        expect(column[0].name).toEqual('ILM Phase');
      });

      test('it returns an emptry array when `isILMAvailable` is false', () => {
        const column = getSummaryTableILMPhaseColumn(false);
        expect(column.length).toEqual(0);
      });
    });

    describe('getSummaryTableSizeInBytesColumn', () => {
      test('it returns the expected column configuration when `isILMAvailable` is true', () => {
        const column = getSummaryTableSizeInBytesColumn({
          isILMAvailable: true,
          formatBytes: jest.fn(),
        });
        expect(column.length).toEqual(1);
        expect(column[0].name).toEqual('Size');
      });

      test('it returns an emptry array when `isILMAvailable` is false', () => {
        const column = getSummaryTableSizeInBytesColumn({
          isILMAvailable: false,
          formatBytes: jest.fn(),
        });
        expect(column.length).toEqual(0);
      });
    });

    describe('ilmPhase column render()', () => {
      test('it renders the expected ilmPhase badge content', () => {
        const columns = getSummaryTableColumns({
          formatBytes,
          formatNumber,
          itemIdToExpandedRowMap: {},
          isILMAvailable,
          pattern: 'auditbeat-*',
          toggleExpanded: jest.fn(),
        });
        const ilmPhaseRender = (columns[5] as EuiTableFieldDataColumnType<IndexSummaryTableItem>)
          .render;

        render(
          <TestProviders>
            {ilmPhaseRender != null && ilmPhaseRender(hasIncompatible, hasIncompatible)}
          </TestProviders>
        );

        expect(screen.getByTestId('ilmPhase')).toHaveTextContent('hot');
      });

      test('it does NOT render the ilmPhase badge when `ilmPhase` is undefined', () => {
        const ilmPhaseIsUndefined: IndexSummaryTableItem = {
          ...indexSummaryTableItem,
          ilmPhase: undefined, // <--
        };

        const columns = getSummaryTableColumns({
          formatBytes,
          formatNumber,
          itemIdToExpandedRowMap: {},
          isILMAvailable,
          pattern: 'auditbeat-*',
          toggleExpanded: jest.fn(),
        });
        const ilmPhaseRender = (columns[5] as EuiTableFieldDataColumnType<IndexSummaryTableItem>)
          .render;

        render(
          <TestProviders>
            {ilmPhaseRender != null && ilmPhaseRender(ilmPhaseIsUndefined, ilmPhaseIsUndefined)}
          </TestProviders>
        );

        expect(screen.queryByTestId('ilmPhase')).not.toBeInTheDocument();
      });

      test('it does NOT render the ilmPhase badge when `isILMAvailable` is false', () => {
        const ilmPhaseIsUndefined: IndexSummaryTableItem = {
          ...indexSummaryTableItem,
        };

        const columns = getSummaryTableColumns({
          formatBytes,
          formatNumber,
          itemIdToExpandedRowMap: {},
          isILMAvailable: false,
          pattern: 'auditbeat-*',
          toggleExpanded: jest.fn(),
        });
        const ilmPhaseRender = (columns[5] as EuiTableFieldDataColumnType<IndexSummaryTableItem>)
          .render;

        render(
          <TestProviders>
            {ilmPhaseRender != null && ilmPhaseRender(ilmPhaseIsUndefined, ilmPhaseIsUndefined)}
          </TestProviders>
        );

        expect(screen.queryByTestId('ilmPhase')).not.toBeInTheDocument();
      });
    });

    describe('sizeInBytes render()', () => {
      test('it renders the expected formatted bytes', () => {
        const columns = getSummaryTableColumns({
          formatBytes,
          formatNumber,
          itemIdToExpandedRowMap: {},
          isILMAvailable,
          pattern: 'auditbeat-*',
          toggleExpanded: jest.fn(),
        });

        const sizeInBytesRender = (columns[6] as EuiTableFieldDataColumnType<IndexSummaryTableItem>)
          .render;

        render(
          <TestProviders>
            {sizeInBytesRender != null &&
              sizeInBytesRender(indexSummaryTableItem, indexSummaryTableItem)}
          </TestProviders>
        );

        expect(screen.getByTestId('sizeInBytes')).toHaveTextContent('98.6MB');
      });

      test('it should not render sizeInBytes if it is not a number', () => {
        const testIndexSummaryTableItem = { ...indexSummaryTableItem, sizeInBytes: undefined };
        const columns = getSummaryTableColumns({
          formatBytes,
          formatNumber,
          itemIdToExpandedRowMap: {},
          isILMAvailable,
          pattern: 'auditbeat-*',
          toggleExpanded: jest.fn(),
        });

        const sizeInBytesRender = (columns[6] as EuiTableFieldDataColumnType<IndexSummaryTableItem>)
          .render;

        render(
          <TestProviders>
            {sizeInBytesRender != null &&
              sizeInBytesRender(testIndexSummaryTableItem, testIndexSummaryTableItem)}
          </TestProviders>
        );

        expect(screen.queryByTestId('sizeInBytes')).toBeNull();
      });
    });
  });

  describe('getShowPagination', () => {
    test('it returns true when `totalItemCount` is greater than `minPageSize`', () => {
      expect(
        getShowPagination({
          minPageSize: 10,
          totalItemCount: 11,
        })
      ).toBe(true);
    });

    test('it returns false when `totalItemCount` equals `minPageSize`', () => {
      expect(
        getShowPagination({
          minPageSize: 10,
          totalItemCount: 10,
        })
      ).toBe(false);
    });

    test('it returns false when `totalItemCount` is less than `minPageSize`', () => {
      expect(
        getShowPagination({
          minPageSize: 10,
          totalItemCount: 9,
        })
      ).toBe(false);
    });
  });
});
