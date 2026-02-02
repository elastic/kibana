/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { fieldFormatsServiceMock } from '@kbn/field-formats-plugin/public/mocks';
import type { IUiSettingsClient } from '@kbn/core/public';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { fireEvent, screen, render } from '@testing-library/react';
import { kqlPluginMock } from '@kbn/kql/public/mocks';
import type { FiltersIndexPatternColumn, FormBasedLayer } from '@kbn/lens-common';
import { filtersOperation } from '..';
import { createMockedIndexPattern } from '../../../mocks';
import userEvent from '@testing-library/user-event';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { coreMock } from '@kbn/core/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import { EuiThemeProvider } from '@elastic/eui';

const uiSettingsMock = {} as IUiSettingsClient;
const coreMockStart = coreMock.createStart();

const mockServices = {
  http: coreMockStart.http,
  storage: {} as IStorageWrapper,
  dataViews: dataViewPluginMocks.createStartContract(),
  data: dataPluginMock.createStartContract(),
  uiSettings: uiSettingsMock,
  notifications: coreMockStart.notifications,
  kql: kqlPluginMock.createStartContract(),
  docLinks: coreMockStart.docLinks,
};

const wrapInProviders = (component: React.ReactElement) => (
  <KibanaContextProvider services={mockServices}>
    <I18nProvider>
      <EuiThemeProvider>{component}</EuiThemeProvider>
    </I18nProvider>
  </KibanaContextProvider>
);

const defaultProps = {
  ...mockServices,
  dateRange: { fromDate: 'now-1d', toDate: 'now' },
  fieldFormats: fieldFormatsServiceMock.createStartContract(),
  indexPattern: createMockedIndexPattern(),
  operationDefinitionMap: {},
  isFullscreen: false,
  toggleFullscreen: jest.fn(),
  setIsCloseable: jest.fn(),
  layerId: '1',
};

// @ts-expect-error
window['__@hello-pangea/dnd-disable-dev-warnings'] = true; // issue with enzyme & @hello-pangea/dnd throwing errors: https://github.com/hello-pangea/dnd/issues/644
jest.mock('@kbn/kql/public', () => ({
  QueryStringInput: () => {
    return 'QueryStringInput';
  },
}));

// mocking random id generator function
jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');

  return {
    ...original,
    htmlIdGenerator: (fn: unknown) => {
      let counter = 0;
      return () => counter++;
    },
  };
});

describe('filters', () => {
  let layer: FormBasedLayer;
  const InlineOptions = filtersOperation.paramEditor!;

  beforeEach(() => {
    layer = {
      indexPatternId: '1',
      columnOrder: ['col1', 'col2'],
      columns: {
        col1: {
          label: 'filters',
          dataType: 'document',
          operationType: 'filters',
          isBucketed: true,
          params: {
            filters: [
              {
                input: { query: 'bytes >= 1', language: 'kuery' },
                label: 'More than one',
              },
              {
                input: { query: 'src : 2', language: 'kuery' },
                label: '',
              },
            ],
          },
        } as FiltersIndexPatternColumn,
        col2: {
          label: 'Count',
          dataType: 'number',
          isBucketed: false,
          sourceField: '___records___',
          operationType: 'count',
        },
      },
    };
  });

  describe('toEsAggsFn', () => {
    it('should reflect params correctly', () => {
      const esAggsFn = filtersOperation.toEsAggsFn(
        layer.columns.col1 as FiltersIndexPatternColumn,
        'col1',
        createMockedIndexPattern(),
        layer,
        uiSettingsMock
      );

      expect(esAggsFn.arguments.filters).toMatchInlineSnapshot(`
        Array [
          Object {
            "chain": Array [
              Object {
                "arguments": Object {
                  "input": Array [
                    Object {
                      "chain": Array [
                        Object {
                          "arguments": Object {
                            "q": Array [
                              "bytes >= 1",
                            ],
                          },
                          "function": "kql",
                          "type": "function",
                        },
                      ],
                      "type": "expression",
                    },
                  ],
                  "label": Array [
                    "More than one",
                  ],
                },
                "function": "queryFilter",
                "type": "function",
              },
            ],
            "type": "expression",
          },
          Object {
            "chain": Array [
              Object {
                "arguments": Object {
                  "input": Array [
                    Object {
                      "chain": Array [
                        Object {
                          "arguments": Object {
                            "q": Array [
                              "src : 2",
                            ],
                          },
                          "function": "kql",
                          "type": "function",
                        },
                      ],
                      "type": "expression",
                    },
                  ],
                  "label": Array [
                    "",
                  ],
                },
                "function": "queryFilter",
                "type": "function",
              },
            ],
            "type": "expression",
          },
        ]
      `);
    });
  });

  describe('getPossibleOperation', () => {
    it('should return operation with the right type for document', () => {
      expect(filtersOperation.getPossibleOperation()).toEqual({
        dataType: 'string',
        isBucketed: true,
        scale: 'ordinal',
      });
    });
  });

  describe('buildColumn', () => {
    it('should build a column with a default query', () => {
      expect(
        filtersOperation.buildColumn({
          previousColumn: undefined,
          layer,
          indexPattern: defaultProps.indexPattern,
        })
      ).toEqual({
        label: 'Filters',
        dataType: 'string',
        operationType: 'filters',
        isBucketed: true,
        params: {
          filters: [
            {
              input: {
                query: '',
                language: 'kuery',
              },
              label: '',
            },
          ],
        },
      });
    });

    it('should inherit terms field when transitioning to filters', () => {
      expect(
        filtersOperation.buildColumn({
          previousColumn: {
            operationType: 'terms',
            sourceField: 'bytes',
            label: 'Top values of bytes',
            isBucketed: true,
            dataType: 'number',
            params: {
              // let's ignore terms params here
              format: { id: 'number', params: { decimals: 0 } },
            },
          },
          layer,
          indexPattern: defaultProps.indexPattern,
        })
      ).toEqual({
        label: 'Filters',
        dataType: 'string',
        operationType: 'filters',
        isBucketed: true,
        params: {
          filters: [
            {
              input: {
                query: '"bytes" : *',
                language: 'kuery',
              },
              label: '',
            },
          ],
        },
      });
    });

    it('should carry over multi terms as multiple filters', () => {
      expect(
        filtersOperation.buildColumn({
          previousColumn: {
            operationType: 'terms',
            sourceField: 'bytes',
            label: 'Top values of bytes',
            isBucketed: true,
            dataType: 'number',
            params: {
              // let's ignore terms params here
              format: { id: 'number', params: { decimals: 0 } },
              // @ts-expect-error not defined in the generic type, only in the Terms specific type
              secondaryFields: ['dest'],
            },
          },
          layer,
          indexPattern: defaultProps.indexPattern,
        })
      ).toEqual({
        label: 'Filters',
        dataType: 'string',
        operationType: 'filters',
        isBucketed: true,
        params: {
          filters: [
            {
              input: {
                query: '"bytes" : *',
                language: 'kuery',
              },
              label: '',
            },
            {
              input: {
                query: '"dest" : *',
                language: 'kuery',
              },
              label: '',
            },
          ],
        },
      });
    });
  });

  describe('popover param editor', () => {
    it('should update state when changing a filter', async () => {
      jest.useFakeTimers();
      // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const updateLayerSpy = jest.fn();
      render(
        wrapInProviders(
          <InlineOptions
            {...defaultProps}
            layer={layer}
            paramEditorUpdater={updateLayerSpy}
            columnId="col1"
            currentColumn={layer.columns.col1 as FiltersIndexPatternColumn}
          />
        )
      );

      await user.click(screen.getAllByTestId('indexPattern-filters-existingFilterTrigger')[1]);
      fireEvent.change(screen.getByTestId('indexPattern-filters-label'), {
        target: { value: 'Dest5' },
      });
      act(() => jest.advanceTimersByTime(256));

      expect(updateLayerSpy).toHaveBeenCalledWith({
        ...layer,
        columns: {
          ...layer.columns,
          col1: {
            ...layer.columns.col1,
            params: {
              filters: [
                ...(layer.columns.col1 as FiltersIndexPatternColumn).params.filters.slice(0, 1),
                {
                  input: {
                    language: 'kuery',
                    query: 'src : 2',
                  },
                  label: 'Dest5',
                },
              ],
            },
          },
        },
      });
    });

    describe('Modify filters', () => {
      it('should correctly show existing filters ', () => {
        const updateLayerSpy = jest.fn();
        render(
          wrapInProviders(
            <InlineOptions
              {...defaultProps}
              layer={layer}
              paramEditorUpdater={updateLayerSpy}
              columnId="col1"
              currentColumn={layer.columns.col1 as FiltersIndexPatternColumn}
            />
          )
        );
        const filtersLabels = screen
          .getAllByTestId('indexPattern-filters-existingFilterTrigger')
          .map((button) => button.textContent);
        expect(filtersLabels).toEqual(['More than one', 'src : 2']);
      });

      it('should remove filter', async () => {
        // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
        const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
        jest.useFakeTimers();
        const updateLayerSpy = jest.fn();
        render(
          wrapInProviders(
            <InlineOptions
              {...defaultProps}
              layer={layer}
              paramEditorUpdater={updateLayerSpy}
              columnId="col1"
              currentColumn={layer.columns.col1 as FiltersIndexPatternColumn}
            />
          )
        );

        await user.click(screen.getByTestId('lns-customBucketContainer-remove-1'));

        act(() => jest.advanceTimersByTime(256));

        expect(updateLayerSpy).toHaveBeenCalledWith({
          ...layer,
          columns: {
            ...layer.columns,
            col1: {
              ...layer.columns.col1,
              params: {
                filters: [
                  {
                    input: {
                      language: 'kuery',
                      query: 'bytes >= 1',
                    },
                    label: 'More than one',
                  },
                ],
              },
            },
          },
        });
      });
    });
  });

  describe('getMaxPossibleNumValues', () => {
    it('reports number of filters', () => {
      expect(
        filtersOperation.getMaxPossibleNumValues!(layer.columns.col1 as FiltersIndexPatternColumn)
      ).toBe(2);
    });
  });
});
