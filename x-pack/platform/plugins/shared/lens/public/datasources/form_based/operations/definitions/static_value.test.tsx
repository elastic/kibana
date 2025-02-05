/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { IUiSettingsClient, HttpSetup } from '@kbn/core/public';
import { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import { fieldFormatsServiceMock } from '@kbn/field-formats-plugin/public/mocks';
import { unifiedSearchPluginMock } from '@kbn/unified-search-plugin/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMockedIndexPattern } from '../../mocks';
import { staticValueOperation } from '.';
import { FormBasedLayer } from '../../types';
import { IndexPattern } from '../../../../types';
import { StaticValueIndexPatternColumn } from './static_value';
import { TermsIndexPatternColumn } from './terms';

const uiSettingsMock = {} as IUiSettingsClient;
const dateRange = {
  fromDate: '2022-03-17T08:25:00.000Z',
  toDate: '2022-04-17T08:25:00.000Z',
};

const defaultProps = {
  storage: {} as IStorageWrapper,
  uiSettings: uiSettingsMock,
  dateRange: { fromDate: 'now-1d', toDate: 'now' },
  data: dataPluginMock.createStartContract(),
  fieldFormats: fieldFormatsServiceMock.createStartContract(),
  unifiedSearch: unifiedSearchPluginMock.createStartContract(),
  dataViews: dataViewPluginMocks.createStartContract(),
  http: {} as HttpSetup,
  indexPattern: {
    ...createMockedIndexPattern(),
    hasRestrictions: false,
  } as IndexPattern,
  operationDefinitionMap: {},
  isFullscreen: false,
  toggleFullscreen: jest.fn(),
  setIsCloseable: jest.fn(),
  layerId: '1',
};

describe('static_value', () => {
  let layer: FormBasedLayer;

  beforeEach(() => {
    layer = {
      indexPatternId: '1',
      columnOrder: ['col1', 'col2'],
      columns: {
        col1: {
          label: 'Top value of category',
          dataType: 'string',
          isBucketed: true,
          operationType: 'terms',
          params: {
            orderBy: { type: 'alphabetical' },
            size: 3,
            orderDirection: 'asc',
          },
          sourceField: 'category',
        } as TermsIndexPatternColumn,
        col2: {
          label: 'Static value: 23',
          dataType: 'number',
          isBucketed: false,
          operationType: 'static_value',
          isStaticValue: true,
          references: [],
          params: {
            value: '23',
          },
        } as StaticValueIndexPatternColumn,
      },
    };
  });
  beforeAll(() => {
    jest.useFakeTimers();
  });
  afterAll(() => {
    jest.useRealTimers();
  });

  function getLayerWithStaticValue(newValue: string | null | undefined): FormBasedLayer {
    return {
      ...layer,
      columns: {
        ...layer.columns,
        col2: {
          ...layer.columns.col2,
          label: `Static value: ${newValue ?? String(newValue)}`,
          params: {
            value: newValue,
          },
        } as StaticValueIndexPatternColumn,
      },
    };
  }

  describe('getDefaultLabel', () => {
    it('should return the label for the given value', () => {
      expect(
        staticValueOperation.getDefaultLabel(
          {
            label: 'Static value: 23',
            dataType: 'number',
            isBucketed: false,
            operationType: 'static_value',
            isStaticValue: true,
            references: [],
            params: {
              value: '23',
            },
          },
          layer.columns,
          createMockedIndexPattern()
        )
      ).toBe('Static value: 23');
    });

    it('should return the default label for non valid value', () => {
      expect(
        staticValueOperation.getDefaultLabel(
          {
            label: 'Static value',
            dataType: 'number',
            isBucketed: false,
            operationType: 'static_value',
            references: [],
            params: {
              value: '',
            },
          },
          layer.columns,
          createMockedIndexPattern()
        )
      ).toBe('Static value');
    });
  });

  describe('getErrorMessage', () => {
    it('should return no error for valid values', () => {
      expect(
        staticValueOperation.getErrorMessage!(
          getLayerWithStaticValue('23'),
          'col2',
          createMockedIndexPattern(),
          dateRange
        )
      ).toHaveLength(0);
      // test for potential falsy value
      expect(
        staticValueOperation.getErrorMessage!(
          getLayerWithStaticValue('0'),
          'col2',
          createMockedIndexPattern(),
          dateRange
        )
      ).toHaveLength(0);
    });

    it.each(['NaN', 'Infinity', 'string'])(
      'should return error for invalid values: %s',
      (value) => {
        expect(
          staticValueOperation.getErrorMessage!(
            getLayerWithStaticValue(value),
            'col2',
            createMockedIndexPattern(),
            dateRange
          ).map((e) => e.message)
        ).toEqual(expect.arrayContaining([expect.stringMatching('is not a valid number')]));
      }
    );

    it.each([null, undefined])('should return no error for: %s', (value) => {
      expect(
        staticValueOperation.getErrorMessage!(
          getLayerWithStaticValue(value),
          'col2',
          createMockedIndexPattern(),
          dateRange
        )
      ).toHaveLength(0);
    });
  });

  describe('toExpression', () => {
    it('should return a mathColumn operation with valid value', () => {
      for (const value of ['23', '0', '-1']) {
        expect(
          staticValueOperation.toExpression(
            getLayerWithStaticValue(value),
            'col2',
            createMockedIndexPattern()
          )
        ).toEqual([
          {
            type: 'function',
            function: 'mathColumn',
            arguments: {
              id: ['col2'],
              name: [`Static value: ${value}`],
              expression: [value],
            },
          },
        ]);
      }
    });

    it('should fallback to mapColumn for invalid value', () => {
      for (const value of ['NaN', '', 'Infinity']) {
        expect(
          staticValueOperation.toExpression(
            getLayerWithStaticValue(value),
            'col2',
            createMockedIndexPattern()
          )
        ).toEqual([
          {
            type: 'function',
            function: 'mapColumn',
            arguments: {
              id: ['col2'],
              name: [`Static value`],
              expression: ['100'],
            },
          },
        ]);
      }
    });
  });

  describe('buildColumn', () => {
    it('should set default static value', () => {
      expect(
        staticValueOperation.buildColumn({
          indexPattern: createMockedIndexPattern(),
          layer: { columns: {}, columnOrder: [], indexPatternId: '' },
        })
      ).toEqual({
        label: 'Static value',
        dataType: 'number',
        operationType: 'static_value',
        isStaticValue: true,
        isBucketed: false,
        scale: 'ratio',
        params: { value: '100' },
        references: [],
      });
    });

    it('should merge a previousColumn', () => {
      expect(
        staticValueOperation.buildColumn({
          indexPattern: createMockedIndexPattern(),
          layer: { columns: {}, columnOrder: [], indexPatternId: '' },
          previousColumn: {
            label: 'Static value',
            dataType: 'number',
            operationType: 'static_value',
            isStaticValue: true,
            isBucketed: false,
            scale: 'ratio',
            params: { value: '23' },
            references: [],
          } as StaticValueIndexPatternColumn,
        })
      ).toEqual({
        label: 'Static value: 23',
        dataType: 'number',
        operationType: 'static_value',
        isStaticValue: true,
        isBucketed: false,
        scale: 'ratio',
        params: { value: '23' },
        references: [],
      });
    });

    it('should create a static_value from passed arguments', () => {
      expect(
        staticValueOperation.buildColumn(
          {
            indexPattern: createMockedIndexPattern(),
            layer: { columns: {}, columnOrder: [], indexPatternId: '' },
          },
          { value: '23' }
        )
      ).toEqual({
        label: 'Static value: 23',
        dataType: 'number',
        operationType: 'static_value',
        isStaticValue: true,
        isBucketed: false,
        scale: 'ratio',
        params: { value: '23' },
        references: [],
      });
    });

    it('should prioritize passed arguments over previousColumn', () => {
      expect(
        staticValueOperation.buildColumn(
          {
            indexPattern: createMockedIndexPattern(),
            layer: { columns: {}, columnOrder: [], indexPatternId: '' },
            previousColumn: {
              label: 'Static value',
              dataType: 'number',
              operationType: 'static_value',
              isStaticValue: true,
              isBucketed: false,
              scale: 'ratio',
              params: { value: '23' },
              references: [],
            } as StaticValueIndexPatternColumn,
          },
          { value: '53' }
        )
      ).toEqual({
        label: 'Static value: 53',
        dataType: 'number',
        operationType: 'static_value',
        isStaticValue: true,
        isBucketed: false,
        scale: 'ratio',
        params: { value: '53' },
        references: [],
      });
    });
  });

  describe('paramEditor', () => {
    const ParamEditor = staticValueOperation.paramEditor!;
    it('should render current static_value', () => {
      const updateLayerSpy = jest.fn();
      render(
        <ParamEditor
          {...defaultProps}
          layer={layer}
          paramEditorUpdater={updateLayerSpy}
          columnId="col2"
          currentColumn={layer.columns.col2 as StaticValueIndexPatternColumn}
        />
      );
      const input = screen.getByRole('spinbutton');
      expect(input).toHaveValue(23);
    });

    it('should allow 0 as initial value', () => {
      const updateLayerSpy = jest.fn();
      const zeroLayer = {
        ...layer,
        columns: {
          ...layer.columns,
          col2: {
            ...layer.columns.col2,
            operationType: 'static_value',
            references: [],
            params: {
              value: '0',
            },
          } as StaticValueIndexPatternColumn,
        },
      } as FormBasedLayer;
      render(
        <ParamEditor
          {...defaultProps}
          layer={zeroLayer}
          paramEditorUpdater={updateLayerSpy}
          columnId="col2"
          currentColumn={zeroLayer.columns.col2 as StaticValueIndexPatternColumn}
        />
      );
      expect(screen.getByRole('spinbutton')).toHaveValue(0);
    });

    it('should update state on change', async () => {
      // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const updateLayerSpy = jest.fn();
      render(
        <ParamEditor
          {...defaultProps}
          layer={layer}
          paramEditorUpdater={updateLayerSpy}
          columnId="col2"
          currentColumn={layer.columns.col2 as StaticValueIndexPatternColumn}
        />
      );
      await user.type(screen.getByRole('spinbutton'), '{backspace}{backspace}27');
      jest.advanceTimersByTime(256);
      expect(updateLayerSpy).toHaveBeenCalledTimes(1);
      expect(updateLayerSpy.mock.calls[0][0](layer)).toEqual({
        ...layer,
        columns: {
          ...layer.columns,
          col2: {
            ...layer.columns.col2,
            params: {
              value: '27',
            },
            label: 'Static value: 27',
          },
        },
      });
    });

    it('should not update on invalid input, but show invalid value locally', async () => {
      // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const updateLayerSpy = jest.fn();
      render(
        <ParamEditor
          {...defaultProps}
          layer={layer}
          paramEditorUpdater={updateLayerSpy}
          columnId="col2"
          currentColumn={layer.columns.col2 as StaticValueIndexPatternColumn}
        />
      );

      await user.type(screen.getByRole('spinbutton'), '{backspace}{backspace}');
      jest.advanceTimersByTime(256);
      expect(updateLayerSpy).not.toHaveBeenCalled();
      expect(screen.getByRole('spinbutton')).toHaveValue(null);
    });
  });
});
