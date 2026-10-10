/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, screen } from '@testing-library/react';

import { CustomFieldTypes } from '../../../common/types/domain';
import type { CasesConfigurationUICustomField, SimilarCaseUI } from '../../../common/ui/types';
import { TestProviders, renderWithTestingProviders } from '../../common/mock';
import { mockCase, mockSimilarObservables } from '../../containers/mock';
import { useCasesColumnsConfiguration } from '../all_cases/hooks/use_cases_columns_configuration';
import type { UseSimilarCasesColumnsReturnValue } from './use_similar_cases_columns';
import { useSimilarCasesColumns } from './use_similar_cases_columns';

jest.mock('../all_cases/hooks/use_cases_columns_configuration');

const useCasesColumnsConfigurationMock = useCasesColumnsConfiguration as jest.Mock;

const getEntry = (field: string, name: string) => ({
  field,
  name,
  canDisplay: true,
  isCheckedDefault: true,
});

const casesColumnsConfig = {
  title: getEntry('title', 'Name'),
  assignees: getEntry('assignees', 'Assignees'),
  tags: getEntry('tags', 'Tags'),
  totalAlerts: getEntry('totalAlerts', 'Alerts'),
  totalEvents: getEntry('totalEvents', 'Events'),
  totalComment: getEntry('totalComment', 'Comments'),
  category: getEntry('category', 'Category'),
  closedAt: getEntry('closedAt', 'Closed on'),
  createdAt: getEntry('createdAt', 'Created on'),
  updatedAt: getEntry('updatedAt', 'Updated on'),
  externalIncident: getEntry('externalIncident', 'External Incident'),
  status: getEntry('status', 'Status'),
  severity: getEntry('severity', 'Severity'),
};

const wrapper: React.FC<React.PropsWithChildren<{}>> = ({ children }) => (
  <TestProviders>{children}</TestProviders>
);

const getFields = (columns: UseSimilarCasesColumnsReturnValue['columns']) =>
  columns.map((column) => ('field' in column ? column.field : undefined));

describe('useSimilarCasesColumns', () => {
  beforeEach(() => {
    useCasesColumnsConfigurationMock.mockReturnValue(casesColumnsConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('default fallback (catalog order)', () => {
    const defaultFields = ['title', 'tags', 'category', 'createdAt', 'status', 'severity'];

    it('uses the default column set when selectedColumns is undefined', () => {
      const { result } = renderHook(() => useSimilarCasesColumns(), { wrapper });

      expect(getFields(result.current.columns)).toEqual([...defaultFields, 'similarities']);
    });

    it('uses the default column set when selectedColumns is an empty array', () => {
      const { result } = renderHook(() => useSimilarCasesColumns({ selectedColumns: [] }), {
        wrapper,
      });

      expect(getFields(result.current.columns)).toEqual([...defaultFields, 'similarities']);
    });
  });

  it('returns the title field as the row header', () => {
    const { result } = renderHook(() => useSimilarCasesColumns(), { wrapper });

    expect(result.current.rowHeader).toBe('title');
  });

  it('omits an unchecked column', () => {
    const { result } = renderHook(
      () =>
        useSimilarCasesColumns({
          selectedColumns: [
            { field: 'title', name: 'Name', isChecked: true },
            { field: 'tags', name: 'Tags', isChecked: false },
            { field: 'status', name: 'Status', isChecked: true },
          ],
        }),
      { wrapper }
    );

    expect(getFields(result.current.columns)).toEqual(['title', 'status', 'similarities']);
  });

  it('ignores an unknown field id', () => {
    const { result } = renderHook(
      () =>
        useSimilarCasesColumns({
          selectedColumns: [
            { field: 'title', name: 'Name', isChecked: true },
            { field: 'doesNotExist', name: 'Unknown', isChecked: true },
          ],
        }),
      { wrapper }
    );

    expect(getFields(result.current.columns)).toEqual(['title', 'similarities']);
  });

  it('keeps similarities as the last column', () => {
    const { result } = renderHook(
      () =>
        useSimilarCasesColumns({
          selectedColumns: [
            { field: 'severity', name: 'Severity', isChecked: true },
            { field: 'title', name: 'Name', isChecked: true },
          ],
        }),
      { wrapper }
    );

    expect(getFields(result.current.columns)).toEqual(['severity', 'title', 'similarities']);
  });

  it('returns only the similarities column when every column is unchecked', () => {
    const { result } = renderHook(
      () =>
        useSimilarCasesColumns({
          selectedColumns: [{ field: 'title', name: 'Name', isChecked: false }],
        }),
      { wrapper }
    );

    expect(getFields(result.current.columns)).toEqual(['similarities']);
  });

  describe('custom fields', () => {
    const toggleKey = 'toggle_key';
    const customFields: CasesConfigurationUICustomField[] = [
      {
        key: toggleKey,
        label: 'My toggle',
        type: CustomFieldTypes.TOGGLE,
        required: false,
        defaultValue: false,
      },
    ];
    const selectedColumns = [
      { field: 'title', name: 'Name', isChecked: true },
      { field: toggleKey, name: 'My toggle', isChecked: true },
    ];
    const similarCase: SimilarCaseUI = {
      ...mockCase,
      similarities: { observables: mockSimilarObservables },
    };

    const renderCustomFieldCell = (theCase: SimilarCaseUI) => {
      const { result } = renderHook(
        () => useSimilarCasesColumns({ selectedColumns, customFields }),
        { wrapper }
      );
      const column = result.current.columns[1] as unknown as {
        render: (item: SimilarCaseUI) => React.ReactNode;
      };

      renderWithTestingProviders(<>{column.render(theCase)}</>);
    };

    it('renders a custom field column with a value', () => {
      renderCustomFieldCell({
        ...similarCase,
        customFields: [{ key: toggleKey, type: CustomFieldTypes.TOGGLE, value: true }],
      });

      expect(
        screen.getByTestId(`toggle-custom-field-column-view-${toggleKey}-check`)
      ).toBeInTheDocument();
    });

    it('renders an empty cell for a custom field with a null value', () => {
      renderCustomFieldCell({
        ...similarCase,
        customFields: [{ key: toggleKey, type: CustomFieldTypes.TOGGLE, value: null }],
      });

      expect(
        screen.queryByTestId(`toggle-custom-field-column-view-${toggleKey}-check`)
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId(`toggle-custom-field-column-view-${toggleKey}-cross`)
      ).not.toBeInTheDocument();
    });

    it('skips a custom field with an unsupported type', () => {
      const unsupported = [
        { key: 'bad_key', label: 'Bad', type: 'unsupported', required: false },
      ] as unknown as CasesConfigurationUICustomField[];

      const { result } = renderHook(
        () =>
          useSimilarCasesColumns({
            selectedColumns: [
              { field: 'title', name: 'Name', isChecked: true },
              { field: 'bad_key', name: 'Bad', isChecked: true },
            ],
            customFields: unsupported,
          }),
        { wrapper }
      );

      expect(getFields(result.current.columns)).toEqual(['title', 'similarities']);
    });
  });
});
