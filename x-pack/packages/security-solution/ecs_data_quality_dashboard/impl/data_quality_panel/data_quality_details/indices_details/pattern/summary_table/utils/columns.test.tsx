/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CustomItemAction,
  EuiTableActionsColumnType,
  EuiTableFieldDataColumnType,
} from '@elastic/eui';
import numeral from '@elastic/numeral';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { omit } from 'lodash/fp';
import React from 'react';

import { TestExternalProviders } from '../../../../../mock/test_providers/test_providers';
import { EMPTY_STAT } from '../../../../../constants';
import {
  getIncompatibleStatColor,
  getSummaryTableColumns,
  getSummaryTableILMPhaseColumn,
  getSummaryTableSizeInBytesColumn,
} from './columns';
import { CHECK_INDEX, VIEW_CHECK_DETAILS } from '../translations';
import { IndexSummaryTableItem } from '../../../../../types';
import { getCheckState } from '../../../../../stub/get_check_state';

const defaultBytesFormat = '0,0.[0]b';
const formatBytes = (value: number | undefined) =>
  value != null ? numeral(value).format(defaultBytesFormat) : EMPTY_STAT;

const defaultNumberFormat = '0,0.[000]';
const formatNumber = (value: number | undefined) =>
  value != null ? numeral(value).format(defaultNumberFormat) : EMPTY_STAT;

describe('helpers', () => {
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
        isILMAvailable,
        pattern: 'auditbeat-*',
        onCheckNowAction: jest.fn(),
        onExpandAction: jest.fn(),
        checkState: getCheckState(indexName),
      }).map((x) => omit('render', x));

      expect(columns).toEqual([
        {
          name: 'Actions',
          align: 'center',
          width: '65px',
          actions: [
            {
              name: 'View check details',
              render: expect.any(Function),
            },
            {
              name: 'Check index',
              render: expect.any(Function),
            },
          ],
        },
        {
          field: 'incompatible',
          name: 'Result',
          sortable: true,
          truncateText: false,
          width: '65px',
        },
        { field: 'indexName', name: 'Index', sortable: true, truncateText: false },
        { field: 'docsCount', name: 'Docs', sortable: true, truncateText: false, width: '150px' },
        {
          field: 'incompatible',
          name: 'Incompatible fields',
          sortable: true,
          truncateText: false,
          width: '140px',
        },
        {
          field: 'ilmPhase',
          name: 'ILM Phase',
          sortable: true,
          truncateText: false,
          width: '92px',
        },
        { field: 'sizeInBytes', name: 'Size', sortable: true, truncateText: false, width: '67px' },
        {
          field: 'checkedAt',
          name: 'Last check',
          sortable: true,
          truncateText: false,
          width: '120px',
        },
      ]);
    });

    describe('action columns render()', () => {
      test('it renders check index button', () => {
        const columns = getSummaryTableColumns({
          formatBytes,
          formatNumber,
          isILMAvailable,
          pattern: 'auditbeat-*',
          onCheckNowAction: jest.fn(),
          onExpandAction: jest.fn(),
          checkState: getCheckState(indexName),
        });
        const checkNowRender = (
          (columns[0] as EuiTableActionsColumnType<IndexSummaryTableItem>)
            .actions[1] as CustomItemAction<IndexSummaryTableItem>
        ).render;

        render(
          <TestExternalProviders>
            {checkNowRender != null && checkNowRender(indexSummaryTableItem, true)}
          </TestExternalProviders>
        );

        expect(screen.getByLabelText(CHECK_INDEX)).toBeInTheDocument();
      });

      test('it invokes the `onCheckNowAction` with the index name when the check index button is clicked', () => {
        const onCheckNowAction = jest.fn();

        const columns = getSummaryTableColumns({
          formatBytes,
          formatNumber,
          isILMAvailable,
          pattern: 'auditbeat-*',
          onCheckNowAction,
          onExpandAction: jest.fn(),
          checkState: getCheckState(indexName),
        });
        const checkNowRender = (
          (columns[0] as EuiTableActionsColumnType<IndexSummaryTableItem>)
            .actions[1] as CustomItemAction<IndexSummaryTableItem>
        ).render;

        render(
          <TestExternalProviders>
            {checkNowRender != null && checkNowRender(indexSummaryTableItem, true)}
          </TestExternalProviders>
        );

        const button = screen.getByLabelText(CHECK_INDEX);
        userEvent.click(button);

        expect(onCheckNowAction).toBeCalledWith(indexSummaryTableItem.indexName);
      });

      test('it renders disabled check index with loading indicator when check state is loading', () => {
        const columns = getSummaryTableColumns({
          formatBytes,
          formatNumber,
          isILMAvailable,
          pattern: 'auditbeat-*',
          onCheckNowAction: jest.fn(),
          onExpandAction: jest.fn(),
          checkState: getCheckState(indexName, { isChecking: true }),
        });

        const checkNowRender = (
          (columns[0] as EuiTableActionsColumnType<IndexSummaryTableItem>)
            .actions[1] as CustomItemAction<IndexSummaryTableItem>
        ).render;

        render(
          <TestExternalProviders>
            {checkNowRender != null && checkNowRender(indexSummaryTableItem, true)}
          </TestExternalProviders>
        );

        expect(screen.getByLabelText(CHECK_INDEX)).toBeDisabled();
        expect(screen.getByLabelText('Loading')).toBeInTheDocument();
      });

      test('it invokes the `onExpandAction` with the index name when the view check details button is clicked', () => {
        const onExpandAction = jest.fn();

        const columns = getSummaryTableColumns({
          formatBytes,
          formatNumber,
          isILMAvailable,
          pattern: 'auditbeat-*',
          onCheckNowAction: jest.fn(),
          onExpandAction,
          checkState: getCheckState(indexName),
        });

        const expandActionRender = (
          (columns[0] as EuiTableActionsColumnType<IndexSummaryTableItem>)
            .actions[0] as CustomItemAction<IndexSummaryTableItem>
        ).render;

        render(
          <TestExternalProviders>
            {expandActionRender != null && expandActionRender(indexSummaryTableItem, true)}
          </TestExternalProviders>
        );

        const button = screen.getByLabelText(VIEW_CHECK_DETAILS);
        userEvent.click(button);

        expect(onExpandAction).toBeCalledWith(indexSummaryTableItem.indexName);
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
          isILMAvailable,
          pattern: 'auditbeat-*',
          onCheckNowAction: jest.fn(),
          onExpandAction: jest.fn(),
          checkState: getCheckState(indexName),
        });
        const incompatibleRender = (
          columns[1] as EuiTableFieldDataColumnType<IndexSummaryTableItem>
        ).render;

        render(
          <TestExternalProviders>
            {incompatibleRender != null &&
              incompatibleRender(incompatibleIsUndefined, incompatibleIsUndefined)}
          </TestExternalProviders>
        );

        expect(screen.getByTestId('incompatiblePlaceholder')).toHaveTextContent(EMPTY_STAT);
      });

      test('it renders Fail badge when there are incompatible fields', () => {
        const columns = getSummaryTableColumns({
          formatBytes,
          formatNumber,
          isILMAvailable,
          pattern: 'auditbeat-*',
          onCheckNowAction: jest.fn(),
          onExpandAction: jest.fn(),
          checkState: getCheckState(indexName),
        });
        const incompatibleRender = (
          columns[1] as EuiTableFieldDataColumnType<IndexSummaryTableItem>
        ).render;

        render(
          <TestExternalProviders>
            {incompatibleRender != null && incompatibleRender(hasIncompatible, hasIncompatible)}
          </TestExternalProviders>
        );

        expect(screen.getByText('Fail')).toBeInTheDocument();
      });

      test('it renders the expected icon when there are zero fields', () => {
        const zeroIncompatible: IndexSummaryTableItem = {
          ...indexSummaryTableItem,
          incompatible: 0, // <-- one incompatible field
        };

        const columns = getSummaryTableColumns({
          formatBytes,
          formatNumber,
          isILMAvailable,
          pattern: 'auditbeat-*',
          onCheckNowAction: jest.fn(),
          onExpandAction: jest.fn(),
          checkState: getCheckState(indexName),
        });
        const incompatibleRender = (
          columns[1] as EuiTableFieldDataColumnType<IndexSummaryTableItem>
        ).render;

        render(
          <TestExternalProviders>
            {incompatibleRender != null && incompatibleRender(zeroIncompatible, zeroIncompatible)}
          </TestExternalProviders>
        );

        expect(screen.getByText('Pass')).toBeInTheDocument();
      });
    });

    describe('indexName render()', () => {
      test('it renders the index name', () => {
        const columns = getSummaryTableColumns({
          formatBytes,
          formatNumber,
          isILMAvailable,
          pattern: 'auditbeat-*',
          onCheckNowAction: jest.fn(),
          onExpandAction: jest.fn(),
          checkState: getCheckState(indexName),
        });
        const indexNameRender = (columns[2] as EuiTableFieldDataColumnType<IndexSummaryTableItem>)
          .render;

        render(
          <TestExternalProviders>
            {indexNameRender != null &&
              indexNameRender(indexSummaryTableItem, indexSummaryTableItem)}
          </TestExternalProviders>
        );

        expect(screen.getByTestId('indexName')).toHaveTextContent(indexName);
      });
    });

    describe('docsCount render()', () => {
      beforeEach(() => {
        const columns = getSummaryTableColumns({
          formatBytes,
          formatNumber,
          isILMAvailable,
          pattern: 'auditbeat-*',
          onCheckNowAction: jest.fn(),
          onExpandAction: jest.fn(),
          checkState: getCheckState(indexName),
        });
        const docsCountRender = (columns[3] as EuiTableFieldDataColumnType<IndexSummaryTableItem>)
          .render;

        render(
          <TestExternalProviders>
            {docsCountRender != null && docsCountRender(hasIncompatible, hasIncompatible)}
          </TestExternalProviders>
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
          isILMAvailable,
          pattern: 'auditbeat-*',
          onCheckNowAction: jest.fn(),
          onExpandAction: jest.fn(),
          checkState: getCheckState(indexName),
        });
        const incompatibleRender = (
          columns[4] as EuiTableFieldDataColumnType<IndexSummaryTableItem>
        ).render;

        render(
          <TestExternalProviders>
            {incompatibleRender != null && incompatibleRender(hasIncompatible, hasIncompatible)}
          </TestExternalProviders>
        );

        expect(screen.getByTestId('incompatibleStat')).toHaveTextContent('1');
      });

      test('it renders the expected placeholder when incompatible is undefined', () => {
        const columns = getSummaryTableColumns({
          formatBytes,
          formatNumber,
          isILMAvailable,
          pattern: 'auditbeat-*',
          onCheckNowAction: jest.fn(),
          onExpandAction: jest.fn(),
          checkState: getCheckState(indexName),
        });
        const incompatibleRender = (
          columns[4] as EuiTableFieldDataColumnType<IndexSummaryTableItem>
        ).render;

        render(
          <TestExternalProviders>
            {incompatibleRender != null &&
              incompatibleRender(indexSummaryTableItem, indexSummaryTableItem)}
          </TestExternalProviders>
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
          isILMAvailable,
          pattern: 'auditbeat-*',
          onCheckNowAction: jest.fn(),
          onExpandAction: jest.fn(),
          checkState: getCheckState(indexName),
        });
        const ilmPhaseRender = (columns[5] as EuiTableFieldDataColumnType<IndexSummaryTableItem>)
          .render;

        render(
          <TestExternalProviders>
            {ilmPhaseRender != null && ilmPhaseRender(hasIncompatible, hasIncompatible)}
          </TestExternalProviders>
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
          isILMAvailable,
          pattern: 'auditbeat-*',
          onCheckNowAction: jest.fn(),
          onExpandAction: jest.fn(),
          checkState: getCheckState(indexName),
        });
        const ilmPhaseRender = (columns[5] as EuiTableFieldDataColumnType<IndexSummaryTableItem>)
          .render;

        render(
          <TestExternalProviders>
            {ilmPhaseRender != null && ilmPhaseRender(ilmPhaseIsUndefined, ilmPhaseIsUndefined)}
          </TestExternalProviders>
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
          isILMAvailable: false,
          pattern: 'auditbeat-*',
          onCheckNowAction: jest.fn(),
          onExpandAction: jest.fn(),
          checkState: getCheckState(indexName),
        });
        const ilmPhaseRender = (columns[5] as EuiTableFieldDataColumnType<IndexSummaryTableItem>)
          .render;

        render(
          <TestExternalProviders>
            {ilmPhaseRender != null && ilmPhaseRender(ilmPhaseIsUndefined, ilmPhaseIsUndefined)}
          </TestExternalProviders>
        );

        expect(screen.queryByTestId('ilmPhase')).not.toBeInTheDocument();
      });
    });

    describe('sizeInBytes render()', () => {
      test('it renders the expected formatted bytes', () => {
        const columns = getSummaryTableColumns({
          formatBytes,
          formatNumber,
          isILMAvailable,
          pattern: 'auditbeat-*',
          onCheckNowAction: jest.fn(),
          onExpandAction: jest.fn(),
          checkState: getCheckState(indexName),
        });

        const sizeInBytesRender = (columns[6] as EuiTableFieldDataColumnType<IndexSummaryTableItem>)
          .render;

        render(
          <TestExternalProviders>
            {sizeInBytesRender != null &&
              sizeInBytesRender(indexSummaryTableItem, indexSummaryTableItem)}
          </TestExternalProviders>
        );

        expect(screen.getByTestId('sizeInBytes')).toHaveTextContent('98.6MB');
      });

      test('it should not render sizeInBytes if it is not a number', () => {
        const testIndexSummaryTableItem = { ...indexSummaryTableItem, sizeInBytes: undefined };
        const columns = getSummaryTableColumns({
          formatBytes,
          formatNumber,
          isILMAvailable,
          pattern: 'auditbeat-*',
          onCheckNowAction: jest.fn(),
          onExpandAction: jest.fn(),
          checkState: getCheckState(indexName),
        });

        const sizeInBytesRender = (columns[6] as EuiTableFieldDataColumnType<IndexSummaryTableItem>)
          .render;

        render(
          <TestExternalProviders>
            {sizeInBytesRender != null &&
              sizeInBytesRender(testIndexSummaryTableItem, testIndexSummaryTableItem)}
          </TestExternalProviders>
        );

        expect(screen.queryByTestId('sizeInBytes')).toBeNull();
      });
    });
  });

  describe('getIncompatibleStatColor', () => {
    test('it returns the expected color when incompatible is greater than zero', () => {
      const incompatible = 123;

      expect(getIncompatibleStatColor(incompatible)).toBe('#bd271e');
    });

    test('it returns undefined when incompatible is zero', () => {
      const incompatible = 0;

      expect(getIncompatibleStatColor(incompatible)).toBeUndefined();
    });

    test('it returns undefined when incompatible is undefined', () => {
      const incompatible = undefined;

      expect(getIncompatibleStatColor(incompatible)).toBeUndefined();
    });
  });
});
