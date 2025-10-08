/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EuiFieldNumber, EuiRange, EuiButtonEmpty, EuiLink, EuiText } from '@elastic/eui';
import type { IUiSettingsClient, HttpSetup } from '@kbn/core/public';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { fieldFormatsServiceMock } from '@kbn/field-formats-plugin/public/mocks';
import { unifiedSearchPluginMock } from '@kbn/unified-search-plugin/public/mocks';
import { mountWithProviders, renderWithProviders } from '../../../../../test_utils/test_utils';
import type { FormBasedLayer } from '../../../types';
import { rangeOperation } from '..';
import type { RangeIndexPatternColumn } from './ranges';
import {
  MODES,
  DEFAULT_INTERVAL,
  TYPING_DEBOUNCE_TIME,
  MIN_HISTOGRAM_BARS,
  SLICES,
} from './constants';
import { RangePopover } from './advanced_editor';
import { DragDropBuckets } from '@kbn/visualization-ui-components';
import { getFieldByNameFactory } from '../../../pure_helpers';
import type { IndexPattern } from '../../../../../types';
import userEvent from '@testing-library/user-event';

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

jest.mock('react-use/lib/useDebounce', () => (fn: () => void) => fn());

jest.mock('lodash', () => {
  const original = jest.requireActual('lodash');

  return {
    ...original,
    debounce: (fn: unknown) => fn,
  };
});

const dataPluginMockValue = dataPluginMock.createStartContract();
const unifiedSearchPluginMockValue = unifiedSearchPluginMock.createStartContract();
const fieldFormatsPluginMockValue = fieldFormatsServiceMock.createStartContract();
const dataViewsPluginMockValue = dataViewPluginMocks.createStartContract();
// need to overwrite the formatter field first
dataPluginMockValue.fieldFormats.deserialize = jest.fn().mockImplementation(({ id, params }) => {
  return {
    convert: ({ gte, lt }: { gte: string; lt: string }) => {
      if (params?.id === 'custom') {
        return `Custom format: ${gte} - ${lt}`;
      }
      if (params?.id === 'bytes') {
        return `Bytes format: ${gte} - ${lt}`;
      }
      if (!id) {
        return 'Error';
      }
      return `${gte} - ${lt}`;
    },
  };
});

// need this for MAX_HISTOGRAM value
const uiSettingsMock = {
  get: jest.fn().mockReturnValue(100),
} as unknown as IUiSettingsClient;

const sourceField = 'MyField';
const defaultOptions = {
  storage: {} as IStorageWrapper,
  uiSettings: uiSettingsMock,
  dateRange: {
    fromDate: 'now-1y',
    toDate: 'now',
  },
  data: dataPluginMockValue,
  fieldFormats: fieldFormatsPluginMockValue,
  unifiedSearch: unifiedSearchPluginMockValue,
  dataViews: dataViewsPluginMockValue,
  http: {} as HttpSetup,
  indexPattern: {
    id: '1',
    title: 'my_index_pattern',
    hasRestrictions: false,
    fields: [
      {
        name: sourceField,
        type: 'number',
        displayName: sourceField,
        searchable: true,
        aggregatable: true,
      },
    ],
    getFieldByName: getFieldByNameFactory([
      {
        name: sourceField,
        type: 'number',
        displayName: sourceField,
        searchable: true,
        aggregatable: true,
      },
    ]),
    getFormatterForField: () => ({ convert: (v: unknown) => v }),
    isPersisted: true,
    spec: {},
  },
  operationDefinitionMap: {},
  isFullscreen: false,
  toggleFullscreen: jest.fn(),
  setIsCloseable: jest.fn(),
  layerId: '1',
};

describe('ranges', () => {
  let layer: FormBasedLayer;
  const InlineOptions = rangeOperation.paramEditor!;
  const MAX_HISTOGRAM_VALUE = 100;
  const GRANULARITY_DEFAULT_VALUE = (MAX_HISTOGRAM_VALUE - MIN_HISTOGRAM_BARS) / 2;
  const GRANULARITY_STEP = (MAX_HISTOGRAM_VALUE - MIN_HISTOGRAM_BARS) / SLICES;

  function setToHistogramMode() {
    const column = layer.columns.col1 as RangeIndexPatternColumn;
    column.dataType = 'number';
    column.params.type = MODES.Histogram;
  }

  function setToRangeMode() {
    const column = layer.columns.col1 as RangeIndexPatternColumn;
    column.dataType = 'string';
    column.params.type = MODES.Range;
  }

  function getDefaultLayer(): FormBasedLayer {
    return {
      indexPatternId: '1',
      columnOrder: ['col1', 'col2'],
      columns: {
        // Start with the histogram type
        col1: {
          label: sourceField,
          dataType: 'number',
          operationType: 'range',
          isBucketed: true,
          sourceField,
          params: {
            type: MODES.Histogram,
            ranges: [{ from: 0, to: DEFAULT_INTERVAL, label: '' }],
            maxBars: 'auto',
          },
        } as RangeIndexPatternColumn,
        col2: {
          label: 'Count',
          dataType: 'number',
          isBucketed: false,
          sourceField: '___records___',
          operationType: 'count',
        },
      },
    };
  }

  beforeAll(() => {
    jest.useFakeTimers({ legacyFakeTimers: true });
  });

  beforeEach(() => {
    layer = getDefaultLayer();
  });

  describe('toEsAggsFn', () => {
    afterAll(() => setToHistogramMode());

    it('should reflect params correctly', () => {
      const esAggsFn = rangeOperation.toEsAggsFn(
        layer.columns.col1 as RangeIndexPatternColumn,
        'col1',
        {} as IndexPattern,
        layer,
        uiSettingsMock,
        []
      );
      expect(esAggsFn).toMatchInlineSnapshot(`
        Object {
          "arguments": Object {
            "autoExtendBounds": Array [
              false,
            ],
            "enabled": Array [
              true,
            ],
            "extended_bounds": Array [
              Object {
                "chain": Array [
                  Object {
                    "arguments": Object {},
                    "function": "extendedBounds",
                    "type": "function",
                  },
                ],
                "type": "expression",
              },
            ],
            "field": Array [
              "MyField",
            ],
            "has_extended_bounds": Array [
              false,
            ],
            "id": Array [
              "col1",
            ],
            "interval": Array [
              "auto",
            ],
            "maxBars": Array [
              49.5,
            ],
            "min_doc_count": Array [
              false,
            ],
            "schema": Array [
              "segment",
            ],
          },
          "function": "aggHistogram",
          "type": "function",
        }
      `);
    });

    it('should set maxBars param if provided', () => {
      (layer.columns.col1 as RangeIndexPatternColumn).params.maxBars = 10;

      const esAggsFn = rangeOperation.toEsAggsFn(
        layer.columns.col1 as RangeIndexPatternColumn,
        'col1',
        {} as IndexPattern,
        layer,
        uiSettingsMock,
        []
      );

      expect(esAggsFn).toEqual(
        expect.objectContaining({
          function: 'aggHistogram',
          arguments: expect.objectContaining({
            maxBars: [10],
          }),
        })
      );
    });

    it('should reflect show empty rows correctly', () => {
      (layer.columns.col1 as RangeIndexPatternColumn).params.maxBars = 10;
      (layer.columns.col1 as RangeIndexPatternColumn).params.includeEmptyRows = true;

      const esAggsFn = rangeOperation.toEsAggsFn(
        layer.columns.col1 as RangeIndexPatternColumn,
        'col1',
        {} as IndexPattern,
        layer,
        uiSettingsMock,
        []
      );

      expect(esAggsFn).toEqual(
        expect.objectContaining({
          function: 'aggHistogram',
          arguments: expect.objectContaining({
            autoExtendBounds: [true],
            min_doc_count: [true],
          }),
        })
      );
    });

    it('should reflect the type correctly', () => {
      setToRangeMode();

      const esAggsFn = rangeOperation.toEsAggsFn(
        layer.columns.col1 as RangeIndexPatternColumn,
        'col1',
        {} as IndexPattern,
        layer,
        uiSettingsMock,
        []
      );

      expect(esAggsFn).toEqual(
        expect.objectContaining({
          function: 'aggRange',
        })
      );
    });

    it('should include custom labels', () => {
      setToRangeMode();
      (layer.columns.col1 as RangeIndexPatternColumn).params.ranges = [
        { from: 0, to: 100, label: 'customlabel' },
      ];

      const esAggsFn = rangeOperation.toEsAggsFn(
        layer.columns.col1 as RangeIndexPatternColumn,
        'col1',
        {} as IndexPattern,
        layer,
        uiSettingsMock,
        []
      );

      expect(esAggsFn).toHaveProperty(
        'arguments.ranges.0.chain.0.arguments',
        expect.objectContaining({
          from: [0],
          to: [100],
          label: ['customlabel'],
        })
      );
    });
  });

  describe('getPossibleOperationForField', () => {
    it('should return operation with the right type for number', () => {
      expect(
        rangeOperation.getPossibleOperationForField({
          aggregatable: true,
          searchable: true,
          name: 'test',
          displayName: 'test',
          type: 'number',
        })
      ).toEqual({
        dataType: 'number',
        isBucketed: true,
        scale: 'interval',
      });
    });

    it('should not return operation if field type is not number', () => {
      expect(
        rangeOperation.getPossibleOperationForField({
          aggregatable: false,
          searchable: true,
          name: 'test',
          displayName: 'test',
          type: 'string',
        })
      ).toEqual(undefined);
    });
  });

  describe('paramEditor', () => {
    function renderComponent(
      propsOverrides: Partial<React.ComponentProps<typeof InlineOptions>> = {}
    ) {
      const props: React.ComponentProps<typeof InlineOptions> = {
        ...defaultOptions,
        layer,
        columnId: 'col1',
        currentColumn: layer.columns.col1 as RangeIndexPatternColumn,
        paramEditorUpdater: jest.fn(),
        ...propsOverrides,
      };
      const { rerender, ...rtlRest } = renderWithProviders(<InlineOptions {...props} />);
      return {
        ...rtlRest,
        rerender: (overrides: Partial<React.ComponentProps<typeof InlineOptions>>) => {
          const newProps = { ...props, ...overrides } as React.ComponentProps<typeof InlineOptions>;
          return renderWithProviders(<InlineOptions {...newProps} />);
        },
      };
    }

    describe('Modify intervals in basic mode', () => {
      beforeEach(() => {
        layer = getDefaultLayer();
      });

      it('should start update the state with the default maxBars value', () => {
        renderComponent();
        const input = screen.getByTestId('lns-indexPattern-range-maxBars-field');
        expect(input).toHaveValue(String(GRANULARITY_DEFAULT_VALUE));
      });

      it('should update state when changing Max bars number', async () => {
        const updateLayerSpy = jest.fn();
        renderComponent({ paramEditorUpdater: updateLayerSpy });

        const input = screen.getByTestId('lns-indexPattern-range-maxBars-field');

        screen.debug();

        act(() => {
          jest.advanceTimersByTime(TYPING_DEBOUNCE_TIME * 4);
        });

        fireEvent.change(input, { target: { value: String(MAX_HISTOGRAM_VALUE) } });

        await waitFor(() => {
          expect(updateLayerSpy).toHaveBeenCalledWith({
            ...layer,
            columns: {
              ...layer.columns,
              col1: {
                ...layer.columns.col1,
                params: {
                  ...(layer.columns.col1 as RangeIndexPatternColumn).params,
                  maxBars: MAX_HISTOGRAM_VALUE,
                },
              } as RangeIndexPatternColumn,
            },
          });
        });
      });

      it('should update the state using the plus or minus buttons by the step amount', async () => {
        const updateLayerSpy = jest.fn();
        renderComponent({ paramEditorUpdater: updateLayerSpy });

        const minusButton = screen.getByTestId('lns-indexPattern-range-maxBars-minus');
        const plusButton = screen.getByTestId('lns-indexPattern-range-maxBars-plus');

        act(() => {
          jest.advanceTimersByTime(TYPING_DEBOUNCE_TIME * 4);
        });

        // Click minus
        fireEvent.click(minusButton);
        act(() => {
          jest.advanceTimersByTime(TYPING_DEBOUNCE_TIME * 4);
        });

        await waitFor(() => {
          expect(updateLayerSpy).toHaveBeenCalledWith({
            ...layer,
            columns: {
              ...layer.columns,
              col1: {
                ...layer.columns.col1,
                params: {
                  ...(layer.columns.col1 as RangeIndexPatternColumn).params,
                  maxBars: GRANULARITY_DEFAULT_VALUE - GRANULARITY_STEP,
                },
              } as RangeIndexPatternColumn,
            },
          });
        });

        // Click plus
        fireEvent.click(plusButton);
        act(() => {
          jest.advanceTimersByTime(TYPING_DEBOUNCE_TIME * 4);
        });

        await waitFor(() => {
          expect(updateLayerSpy).toHaveBeenCalledWith({
            ...layer,
            columns: {
              ...layer.columns,
              col1: {
                ...layer.columns.col1,
                params: {
                  ...(layer.columns.col1 as RangeIndexPatternColumn).params,
                  maxBars: GRANULARITY_DEFAULT_VALUE,
                },
              } as RangeIndexPatternColumn,
            },
          });
        });
      });
    });

    describe('Specify range intervals manually', () => {
      // @ts-expect-error
      window['__@hello-pangea/dnd-disable-dev-warnings'] = true; // issue with enzyme & @hello-pangea/dnd throwing errors: https://github.com/hello-pangea/dnd/issues/644

      beforeEach(() => setToRangeMode());

      it('should show one range interval to start with', () => {
        renderComponent();
        expect(screen.getAllByTestId('droppable').length).toBe(1);
      });

      it('should use the parentFormat to create the trigger label', () => {
        renderComponent();
        expect(screen.getByTestId('indexPattern-ranges-popover').textContent).toBe('0 - 1000');
      });

      it('should not print error if the parentFormat is not provided', () => {
        renderComponent({
          currentColumn: {
            ...layer.columns.col1,
            params: {
              ...(layer.columns.col1 as RangeIndexPatternColumn).params,
              parentFormat: undefined,
            },
          } as RangeIndexPatternColumn,
        });
        expect(screen.getByTestId('indexPattern-ranges-popover').textContent).not.toBe('Error');
      });

      it('should add a new range', async () => {
        const updateLayerSpy = jest.fn();
        renderComponent({ paramEditorUpdater: updateLayerSpy });
        // Click the add range button
        fireEvent.click(screen.getByRole('button', { name: /add range/i }));
        // There should now be two popovers (ranges)
        expect(screen.getAllByTestId('indexPattern-ranges-popover').length).toBe(2);
        // Find the new range's number input (the second one)
        const numberInputs = screen.getAllByRole('spinbutton');
        fireEvent.change(numberInputs[numberInputs.length - 2], { target: { value: '50' } });
        act(() => {
          jest.advanceTimersByTime(TYPING_DEBOUNCE_TIME * 4);
        });
        await waitFor(() => {
          expect(updateLayerSpy).toHaveBeenCalledWith({
            ...layer,
            columns: {
              ...layer.columns,
              col1: {
                ...layer.columns.col1,
                params: {
                  ...(layer.columns.col1 as RangeIndexPatternColumn).params,
                  ranges: [
                    { from: 0, to: DEFAULT_INTERVAL, label: '' },
                    { from: 50, to: Infinity, label: '' },
                  ],
                },
              } as RangeIndexPatternColumn,
            },
          });
        });
      });

      it('should add a new range with custom label', async () => {
        const updateLayerSpy = jest.fn();
        renderComponent({ paramEditorUpdater: updateLayerSpy });
        fireEvent.click(screen.getByRole('button', { name: /add range/i }));
        expect(screen.getAllByTestId('indexPattern-ranges-popover').length).toBe(2);
        // Find the new label input (the second text input)
        const textInputs = screen.getAllByRole('textbox');
        fireEvent.change(textInputs[textInputs.length - 1], { target: { value: 'customlabel' } });
        act(() => {
          jest.advanceTimersByTime(TYPING_DEBOUNCE_TIME * 4);
        });
        await waitFor(() => {
          expect(updateLayerSpy).toHaveBeenCalledWith({
            ...layer,
            columns: {
              ...layer.columns,
              col1: {
                ...layer.columns.col1,
                params: {
                  ...(layer.columns.col1 as RangeIndexPatternColumn).params,
                  ranges: [
                    { from: 0, to: DEFAULT_INTERVAL, label: '' },
                    { from: DEFAULT_INTERVAL, to: Infinity, label: 'customlabel' },
                  ],
                },
              } as RangeIndexPatternColumn,
            },
          });
        });
      });

      it('should open a popover to edit an existing range', async () => {
        const updateLayerSpy = jest.fn();
        renderComponent({ paramEditorUpdater: updateLayerSpy });
        // Open the popover for the first range
        fireEvent.click(screen.getByTestId('dataView-ranges-popover-trigger'));
        // Change the last number input (the "to" value)
        const numberInputs = screen.getAllByRole('spinbutton');
        fireEvent.change(numberInputs[numberInputs.length - 1], { target: { value: '50' } });
        act(() => {
          jest.advanceTimersByTime(TYPING_DEBOUNCE_TIME * 4);
        });
        await waitFor(() => {
          expect(updateLayerSpy).toHaveBeenCalledWith({
            ...layer,
            columns: {
              ...layer.columns,
              col1: {
                ...layer.columns.col1,
                params: {
                  ...(layer.columns.col1 as RangeIndexPatternColumn).params,
                  ranges: [{ from: 0, to: 50, label: '' }],
                },
              } as RangeIndexPatternColumn,
            },
          });
        });
      });

      it('should not accept invalid ranges', async () => {
        renderComponent();
        // Open the popover for the first range (click the trigger button)
        fireEvent.click(screen.getByTestId('dataView-ranges-popover-trigger'));
        // Now the number inputs should be present
        const numberInputs = screen.getAllByRole('spinbutton');
        fireEvent.change(numberInputs[numberInputs.length - 1], { target: { value: '-1' } });
        // Check for invalid state (aria-invalid or similar)
        await waitFor(() => {
          expect(numberInputs[numberInputs.length - 1]).toHaveAttribute('aria-invalid', 'true');
        });
      });

      it('should be possible to remove a range if multiple', async () => {
        const updateLayerSpy = jest.fn();
        // Add an extra range
        (layer.columns.col1 as RangeIndexPatternColumn).params.ranges.push({
          from: DEFAULT_INTERVAL,
          to: 2 * DEFAULT_INTERVAL,
          label: '',
        });
        renderComponent({ paramEditorUpdater: updateLayerSpy });
        expect(screen.getAllByTestId('indexPattern-ranges-popover').length).toBe(2);
        // Click the remove button for the second range
        fireEvent.click(screen.getByTestId('lns-customBucketContainer-remove-1'));
        // There should now be only one popover
        await waitFor(() => {
          expect(screen.getAllByTestId('indexPattern-ranges-popover').length).toBe(1);
        });
      });

      it('should handle correctly open ranges when saved', async () => {
        // Add an extra open range:
        (layer.columns.col1 as RangeIndexPatternColumn).params.ranges.push({
          from: null,
          to: null,
          label: '',
        });
        renderComponent();

        const triggers = screen.getAllByTestId('dataView-ranges-popover-trigger');
        fireEvent.click(triggers[triggers.length - 1]);
        // Check UI values for open ranges (should be empty string)
        const numberInputs = screen.getAllByRole('spinbutton');
        expect(numberInputs[numberInputs.length - 2]).toHaveValue(null);
        expect(numberInputs[numberInputs.length - 1]).toHaveValue(null);
      });

      it('should correctly handle the default formatter for the field', () => {
        renderComponent({
          indexPattern: {
            ...defaultOptions.indexPattern,
            fieldFormatMap: {
              MyField: { id: 'custom', params: {} },
            },
          },
        });
        // The formatter label should be visible in the popover
        expect(screen.getByText(/^Custom format:/)).toBeInTheDocument();
      });

      it('should correctly pick the dimension formatter for the field', () => {
        // now set a format on the range operation
        (layer.columns.col1 as RangeIndexPatternColumn).params.format = {
          id: 'bytes',
          params: { decimals: 0 },
        };
        renderComponent({
          indexPattern: {
            ...defaultOptions.indexPattern,
            fieldFormatMap: {
              MyField: { id: 'custom', params: {} },
            },
          },
        });
        expect(screen.getByText(/^Bytes format:/)).toBeInTheDocument();
      });

      it('should not update the state on mount', () => {
        const updateLayerSpy = jest.fn();
        renderComponent({ paramEditorUpdater: updateLayerSpy });
        expect(updateLayerSpy.mock.calls.length).toBe(0);
      });

      it('should not reset formatters when switching between custom ranges and auto histogram', async () => {
        const updateLayerSpy = jest.fn();
        // now set a format on the range operation
        (layer.columns.col1 as RangeIndexPatternColumn).params.format = {
          id: 'bytes',
          params: { decimals: 3 },
        };
        renderComponent({ paramEditorUpdater: updateLayerSpy });
        // Simulate switching to custom ranges (open popover)
        fireEvent.click(screen.getByTestId('dataView-ranges-popover-trigger'));
        await waitFor(() => {
          expect(updateLayerSpy.mock.calls[0][0].columns.col1.params.format).toEqual({
            id: 'bytes',
            params: { decimals: 3 },
          });
        });
      });
    });
  });
});
