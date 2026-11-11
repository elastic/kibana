/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithI18n as render } from '@kbn/test-jest-helpers';
import { EuiPopover, EuiLink } from '@elastic/eui';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { kqlPluginMock } from '@kbn/kql/public/mocks';
import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { createMockedIndexPattern } from '../../../mocks';
import { FilterPopover } from './filter_popover';
import { QueryStringInput } from '@kbn/kql/public';
import { QueryInput } from '@kbn/visualization-ui-components';
import type { Query } from '@kbn/es-query';

jest.mock('.', () => ({}));

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual<typeof import('@elastic/eui')>('@elastic/eui');
  return {
    ...original,
    EuiPopover: jest.fn((props: React.ComponentProps<typeof original.EuiPopover>) => (
      <original.EuiPopover {...props} />
    )),
  };
});

jest.mock('@kbn/visualization-ui-components', () => {
  const original = jest.requireActual<typeof import('@kbn/visualization-ui-components')>(
    '@kbn/visualization-ui-components'
  );

  return {
    ...original,
    QueryInput: jest.fn(original.QueryInput),
    isQueryValid: jest.fn((q: Query) => (q.query === 'bytes >= 1 and' ? false : true)),
  };
});

jest.mock('@kbn/kql/public', () => ({
  QueryStringInput: jest.fn(() => 'QueryStringInput'),
}));

describe('filter popover', () => {
  let defaultProps: Parameters<typeof FilterPopover>[0];
  let mockOnClick: jest.Mock;

  const createMockStorage = () => ({
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
    clear: jest.fn(),
  });

  const coreMockStart = coreMock.createStart();
  const mockServices = {
    http: coreMockStart.http,
    storage: createMockStorage(),
    dataViews: dataViewPluginMocks.createStartContract(),
    data: dataPluginMock.createStartContract(),
    uiSettings: coreMockStart.uiSettings,
    notifications: coreMockStart.notifications,
    kql: kqlPluginMock.createStartContract(),
    docLinks: coreMockStart.docLinks,
  };

  const wrapInContext = (component: React.ReactElement) => (
    <KibanaContextProvider services={mockServices}>{component}</KibanaContextProvider>
  );

  beforeEach(() => {
    jest.mocked(EuiPopover).mockClear();
    jest.mocked(QueryInput).mockClear();
    jest.mocked(QueryStringInput).mockClear();
    mockOnClick = jest.fn();

    defaultProps = {
      filter: {
        input: { query: 'bytes >= 1', language: 'kuery' },
        label: 'More than one',
        id: '1',
      },
      setFilter: jest.fn(),
      indexPattern: createMockedIndexPattern(),
      button: <EuiLink onClick={mockOnClick}>trigger</EuiLink>,
      isOpen: true,
      triggerClose: () => {},
    };
  });

  describe('interactions', () => {
    it('should open/close according to isOpen', async () => {
      const { rerender } = render(
        wrapInContext(<FilterPopover {...{ ...defaultProps, isOpen: true }} />)
      );

      expect(screen.getByTestId('indexPattern-filters-label')).toBeInTheDocument();

      rerender(wrapInContext(<FilterPopover {...{ ...defaultProps, isOpen: false }} />));

      await waitFor(() => {
        expect(screen.queryByTestId('indexPattern-filters-label')).not.toBeInTheDocument();
      });
    });

    it('should report click event', () => {
      render(wrapInContext(<FilterPopover {...defaultProps} />));

      expect(mockOnClick).not.toHaveBeenCalled();

      fireEvent.click(
        within(screen.getByTestId('indexPattern-filters-existingFilterContainer')).getByRole(
          'button',
          { name: 'trigger' }
        )
      );

      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('should trigger close', () => {
      const props = { ...defaultProps, triggerClose: jest.fn() };
      render(wrapInContext(<FilterPopover {...props} />));
      const labelInput = screen.getByTestId('indexPattern-filters-label');
      expect(labelInput).toBeInTheDocument();

      // Trigger from EuiPopover
      act(() => {
        jest.mocked(EuiPopover).mock.lastCall?.[0].closePopover();
      });
      expect(props.triggerClose).toHaveBeenCalledTimes(1);

      // Trigger from submit
      fireEvent.keyDown(labelInput, { key: 'Enter' });
      fireEvent.keyUp(labelInput, { key: 'Enter' });
      expect(props.triggerClose).toHaveBeenCalledTimes(2);
    });
  });

  it('passes correct props to QueryStringInput', () => {
    render(wrapInContext(<FilterPopover {...defaultProps} />));
    expect(jest.mocked(QueryStringInput).mock.lastCall?.[0]).toEqual(
      expect.objectContaining({
        dataTestSubj: 'indexPattern-filters-queryStringInput',
        indexPatterns: [{ type: 'id', value: '1' }],
        isInvalid: false,
        query: { language: 'kuery', query: 'bytes >= 1' },
      })
    );
  });

  it('should call setFilter when modifying QueryInput', () => {
    const setFilter = jest.fn();
    render(wrapInContext(<FilterPopover {...defaultProps} setFilter={setFilter} />));
    act(() => {
      jest.mocked(QueryInput).mock.lastCall?.[0].onChange({
        query: 'modified : query',
        language: 'lucene',
      });
    });
    expect(setFilter).toHaveBeenCalledWith({
      input: {
        language: 'lucene',
        query: 'modified : query',
      },
      label: 'More than one',
      id: '1',
    });
  });

  it('should not call setFilter if QueryInput value is not valid', () => {
    const setFilter = jest.fn();
    render(wrapInContext(<FilterPopover {...defaultProps} setFilter={setFilter} />));
    expect(jest.mocked(QueryInput)).toHaveBeenCalled();
    act(() => {
      jest.mocked(QueryInput).mock.lastCall?.[0].onChange({
        query: 'bytes >= 1 and',
        language: 'kuery',
      });
    });
    expect(setFilter).not.toHaveBeenCalled();
  });

  it('should call setFilter when modifying LabelInput', async () => {
    const setFilter = jest.fn();
    render(wrapInContext(<FilterPopover {...defaultProps} setFilter={setFilter} />));
    fireEvent.change(screen.getByTestId('indexPattern-filters-label'), {
      target: { value: 'Modified label' },
    });
    await waitFor(() => {
      expect(setFilter).toHaveBeenCalledWith({
        input: {
          language: 'kuery',
          query: 'bytes >= 1',
        },
        label: 'Modified label',
        id: '1',
      });
    });
  });
});
