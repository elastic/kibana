/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook } from '@testing-library/react';

import { TestProviders } from '../../common/mock';
import { useCasesColumnsConfiguration } from '../all_cases/hooks/use_cases_columns_configuration';
import type { CasesColumnSelection } from '../all_cases/types';
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

const allSelected: CasesColumnSelection[] = Object.values(casesColumnsConfig).map(
  ({ field, name }) => ({ field, name, isChecked: true })
);

describe('useSimilarCasesColumns sortable flags', () => {
  beforeEach(() => {
    useCasesColumnsConfigurationMock.mockReturnValue(casesColumnsConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it.each(['title', 'category', 'status', 'severity', 'createdAt', 'updatedAt', 'closedAt'])(
    'marks the %s column as sortable',
    (field) => {
      const { result } = renderHook(
        () => useSimilarCasesColumns({ selectedColumns: allSelected }),
        {
          wrapper,
        }
      );

      expect(
        result.current.columns.find((column) => 'field' in column && column.field === field)
      ).toEqual(expect.objectContaining({ sortable: true }));
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
    const { result } = renderHook(() => useSimilarCasesColumns({ selectedColumns: allSelected }), {
      wrapper,
    });

    const column = result.current.columns.find(
      (col) => 'field' in col && (col as { field?: unknown }).field === field
    );

    expect(column?.sortable).not.toBe(true);
  });
});
