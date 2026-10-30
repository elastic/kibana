/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, screen } from '@testing-library/react';

import { CustomFieldTypes } from '../../../common/types/domain';
import { FieldType } from '../../../common/types/domain/template/fields';
import type { InlineField } from '../../../common/types/domain/template/fields';
import type { CasesConfigurationUICustomField, SimilarCaseUI } from '../../../common/ui/types';
import { TestProviders, renderWithTestingProviders } from '../../common/mock';
import { mockCase, mockSimilarObservables, connectorsMock } from '../../containers/mock';
import { useCasesColumnsConfiguration } from '../all_cases/hooks/use_cases_columns_configuration';
import { useCasesConfig } from '../../common/lib/kibana';
import { getExtendedFieldColumnKey } from '../all_cases/components/extended_field_columns';
import { useGlobalInlineFields } from '../all_cases/hooks/use_global_inline_fields';
import { ExternalServiceColumn } from '../all_cases/hooks/use_cases_columns';
import { userProfiles, userProfilesMap } from '../../containers/user_profiles/api.mock';
import type { CasesColumnSelection } from '../all_cases/types';
import type { UseSimilarCasesColumnsReturnValue } from './use_similar_cases_columns';
import { useSimilarCasesColumns } from './use_similar_cases_columns';

jest.mock('../all_cases/hooks/use_cases_columns_configuration');
jest.mock('../all_cases/hooks/use_global_inline_fields');
jest.mock('../all_cases/hooks/use_cases_columns', () => ({
  ExternalServiceColumn: jest.fn(() => null),
}));
jest.mock('../../common/lib/kibana', () => ({
  ...jest.requireActual('../../common/lib/kibana'),
  useCasesConfig: jest.fn(),
}));

const useCasesColumnsConfigurationMock = useCasesColumnsConfiguration as jest.Mock;
const useCasesConfigMock = useCasesConfig as jest.Mock;
const useGlobalInlineFieldsMock = useGlobalInlineFields as jest.Mock;

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
    useCasesConfigMock.mockReturnValue({ templatesEnabled: false });
    useGlobalInlineFieldsMock.mockReturnValue({
      globalInlineFields: [],
      isLoading: false,
      isLoaded: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns the title field as the row header', () => {
    const { result } = renderHook(
      () =>
        useSimilarCasesColumns({
          selectedColumns: [{ field: 'title', name: 'Name', isChecked: true }],
        }),
      { wrapper }
    );

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

  describe('sortable flags', () => {
    const allSelected: CasesColumnSelection[] = Object.values(casesColumnsConfig).map(
      ({ field, name }) => ({ field, name, isChecked: true })
    );

    const findColumn = (field: string) => {
      const { result } = renderHook(
        () => useSimilarCasesColumns({ selectedColumns: allSelected }),
        { wrapper }
      );

      // the external incident column has no `field`, so it is matched by its name
      const name = (casesColumnsConfig as Record<string, { name: string }>)[field]?.name;

      return result.current.columns.find(
        (column) =>
          ('field' in column && column.field === field) ||
          (name != null && 'name' in column && column.name === name)
      );
    };

    it.each(['title', 'category', 'status', 'severity', 'createdAt', 'updatedAt', 'closedAt'])(
      'marks the %s column as sortable',
      (field) => {
        const column = findColumn(field);

        expect(column).toBeDefined();
        expect(column).toEqual(expect.objectContaining({ sortable: true }));
      }
    );

    it.each([
      'assignees',
      'tags',
      'totalAlerts',
      'totalEvents',
      'totalComment',
      'externalIncident',
      'similarities',
    ])('does not mark the %s column as sortable', (field) => {
      const column = findColumn(field);

      expect(column).toBeDefined();
      expect(column).toEqual(expect.not.objectContaining({ sortable: true }));
    });
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
  describe('templates v2 extended fields', () => {
    const textField: InlineField = {
      name: 'summary',
      type: 'keyword',
      label: 'Summary',
      control: FieldType.INPUT_TEXT,
    } as InlineField;
    const userField: InlineField = {
      name: 'owner',
      type: 'keyword',
      label: 'Owner',
      control: FieldType.USER_PICKER,
    } as InlineField;
    const textKey = getExtendedFieldColumnKey(textField);
    const userKey = getExtendedFieldColumnKey(userField);
    const similarCase: SimilarCaseUI = {
      ...mockCase,
      similarities: { observables: mockSimilarObservables },
    };

    interface ColumnWithRender {
      name: string;
      sortable?: boolean;
      render: (item: SimilarCaseUI) => React.ReactNode;
    }

    const enableTemplates = (globalInlineFields: InlineField[]) => {
      useCasesConfigMock.mockReturnValue({ templatesEnabled: true });
      useGlobalInlineFieldsMock.mockReturnValue({
        globalInlineFields,
        isLoading: false,
        isLoaded: true,
      });
    };

    const renderColumns = (
      selectedColumns: Array<{ field: string; name: string; isChecked: boolean }>,
      customFields: CasesConfigurationUICustomField[] = []
    ) => renderHook(() => useSimilarCasesColumns({ selectedColumns, customFields }), { wrapper });

    it('renders the extended field value from extendedFields', () => {
      enableTemplates([textField]);
      const { result } = renderColumns([
        { field: 'title', name: 'Name', isChecked: true },
        { field: textKey, name: 'Summary', isChecked: true },
      ]);
      const column = result.current.columns[1] as unknown as ColumnWithRender;

      expect(column.name).toBe('Summary');
      expect(column.sortable).toBeUndefined();

      renderWithTestingProviders(
        <>{column.render({ ...similarCase, extendedFields: { summaryAsKeyword: 'hello' } })}</>
      );

      expect(screen.getByText('hello')).toBeInTheDocument();
    });

    it('does not build legacy custom field columns', () => {
      enableTemplates([textField]);
      const customFields: CasesConfigurationUICustomField[] = [
        {
          key: 'toggle_key',
          label: 'My toggle',
          type: CustomFieldTypes.TOGGLE,
          required: false,
          defaultValue: false,
        },
      ];
      const { result } = renderColumns(
        [
          { field: 'title', name: 'Name', isChecked: true },
          { field: 'toggle_key', name: 'My toggle', isChecked: true },
        ],
        customFields
      );

      expect(getFields(result.current.columns)).toEqual(['title', 'similarities']);
    });

    it('keeps the legacy behavior when templates v2 is off', () => {
      useGlobalInlineFieldsMock.mockReturnValue({
        globalInlineFields: [textField],
        isLoading: false,
        isLoaded: true,
      });
      const { result } = renderColumns([
        { field: 'title', name: 'Name', isChecked: true },
        { field: textKey, name: 'Summary', isChecked: true },
      ]);

      expect(getFields(result.current.columns)).toEqual(['title', 'similarities']);
    });

    it('renders a user-picker field as avatars of the fetched profiles', () => {
      const [profile] = userProfiles;
      enableTemplates([userField]);
      const { result } = renderHook(
        () =>
          useSimilarCasesColumns({
            selectedColumns: [{ field: userKey, name: 'Owner', isChecked: true }],
            userProfiles: userProfilesMap,
          }),
        { wrapper }
      );
      const column = result.current.columns[0] as unknown as ColumnWithRender;

      renderWithTestingProviders(
        <>
          {column.render({
            ...similarCase,
            extendedFields: {
              ownerAsKeyword: JSON.stringify([{ uid: profile.uid, name: 'Jane' }]),
            },
          })}
        </>
      );

      expect(
        screen.getByTestId(`case-table-column-extendedField-${userKey}-${profile.user.username}`)
      ).toBeInTheDocument();
    });

    it('skips a checked key that is not a global field', () => {
      enableTemplates([textField]);
      const { result } = renderColumns([
        { field: 'title', name: 'Name', isChecked: true },
        { field: 'deleted_as_keyword', name: 'Deleted', isChecked: true },
      ]);

      expect(getFields(result.current.columns)).toEqual(['title', 'similarities']);
    });
  });

  describe('external incident column', () => {
    const externalIncidentSelection = [
      { field: 'externalIncident', name: 'External Incident', isChecked: true },
    ];
    const similarCase: SimilarCaseUI = {
      ...mockCase,
      similarities: { observables: mockSimilarObservables },
    };

    it('passes the given connectors to the external incident cell', () => {
      const connectors = connectorsMock;
      const { result } = renderHook(
        () => useSimilarCasesColumns({ selectedColumns: externalIncidentSelection, connectors }),
        { wrapper }
      );
      const column = result.current.columns[0] as unknown as {
        render: (item: SimilarCaseUI) => React.ReactNode;
      };

      renderWithTestingProviders(<>{column.render(similarCase)}</>);

      expect(ExternalServiceColumn).toHaveBeenCalledWith(
        expect.objectContaining({ theCase: similarCase, connectors }),
        expect.anything()
      );
    });
  });
});
