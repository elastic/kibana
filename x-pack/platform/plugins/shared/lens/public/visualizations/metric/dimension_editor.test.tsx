/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor, getByTitle, queryByRole } from '@testing-library/react';
import { faker } from '@faker-js/faker';
import userEvent from '@testing-library/user-event';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { euiLightVars } from '@kbn/ui-theme';
import { CustomPaletteParams, PaletteOutput } from '@kbn/coloring';
import type { DataType } from '../../types';
import { MetricVisualizationState } from './types';
import {
  DimensionEditor,
  DimensionEditorAdditionalSection,
  DimensionEditorDataExtraComponent,
  Props,
  SupportingVisType,
} from './dimension_editor';
import { createMockFramePublicAPI, createMockDatasource } from '../../mocks';
import { GROUP_ID } from './constants';
import { getDefaultConfigForMode } from './helpers';
import { Datatable } from '@kbn/expressions-plugin/common';

// see https://github.com/facebook/jest/issues/4402#issuecomment-534516219
const expectCalledBefore = (mock1: jest.Mock, mock2: jest.Mock) =>
  expect(mock1.mock.invocationCallOrder[0]).toBeLessThan(mock2.mock.invocationCallOrder[0]);

const SELECTORS = {
  PRIMARY_METRIC_EDITOR: 'lnsMetricDimensionEditor_primary_metric',
  SECONDARY_METRIC_EDITOR: 'lnsMetricDimensionEditor_secondary_metric',
  MAX_EDITOR: 'lnsMetricDimensionEditor_maximum',
  BREAKDOWN_EDITOR: 'lnsMetricDimensionEditor_breakdown',
  COLOR_PICKER: 'euiColorPickerAnchor',
};

describe('dimension editor', () => {
  const palette: PaletteOutput<CustomPaletteParams> = {
    type: 'palette',
    name: 'foo',
    params: {
      rangeType: 'percent',
    },
  };

  const fullState: Required<MetricVisualizationState> = {
    layerId: 'first',
    layerType: 'data',
    metricAccessor: 'metric-col-id',
    secondaryMetricAccessor: 'secondary-metric-col-id',
    maxAccessor: 'max-metric-col-id',
    breakdownByAccessor: 'breakdown-col-id',
    collapseFn: 'sum',
    subtitle: faker.lorem.word(5),
    secondaryPrefix: faker.lorem.word(3),
    secondaryTrend: { type: 'none' },
    progressDirection: 'vertical',
    maxCols: 5,
    color: faker.color.rgb(),
    palette,
    icon: 'tag',
    showBar: true,
    titlesTextAlign: 'left',
    valuesTextAlign: 'right',
    iconAlign: 'left',
    valueFontMode: 'default',
    trendlineLayerId: 'second',
    trendlineLayerType: 'metricTrendline',
    trendlineMetricAccessor: 'trendline-metric-col-id',
    trendlineSecondaryMetricAccessor: 'trendline-secondary-metric-accessor',
    trendlineTimeAccessor: 'trendline-time-col-id',
    trendlineBreakdownByAccessor: 'trendline-breakdown-col-id',
  };

  let props: Props;

  const getNonNumericDatasource = () =>
    createMockDatasource('formBased', {
      getOperationForColumnId: jest.fn(() => ({
        hasReducedTimeRange: false,
        dataType: 'string',
        hasTimeShift: false,
        label: 'myMockedOperation',
        isBucketed: false,
      })),
    }).publicAPIMock;

  const getNumericDatasourceWithArraySupport = () =>
    createMockDatasource('formBased', {
      getOperationForColumnId: jest.fn(() => ({
        hasReducedTimeRange: false,
        dataType: 'number',
        hasArraySupport: true,
        hasTimeShift: false,
        label: 'myMockedOperation',
        isBucketed: false,
      })),
    }).publicAPIMock;

  beforeEach(() => {
    props = {
      layerId: 'first',
      groupId: 'some-group',
      accessor: 'some-accessor',
      state: fullState,
      datasource: createMockDatasource('formBased', {
        hasDefaultTimeField: jest.fn(() => true),
        getOperationForColumnId: jest.fn(() => ({
          hasReducedTimeRange: false,
          dataType: 'number',
          hasTimeShift: false,
          label: 'myMockedOperation',
          isBucketed: false,
        })),
      }).publicAPIMock,
      removeLayer: jest.fn(),
      addLayer: jest.fn(),
      frame: createMockFramePublicAPI(),
      setState: jest.fn(),
      panelRef: {} as React.MutableRefObject<HTMLDivElement | null>,
      paletteService: chartPluginMock.createPaletteRegistry(),
    };
  });

  afterEach(() => jest.clearAllMocks());

  describe('primary metric dimension', () => {
    const accessor = 'metric-col-id';
    const metricAccessorState = { ...fullState, metricAccessor: accessor };
    const mockSetState = jest.fn();

    function renderPrimaryMetricEditor(overrides = {}) {
      const rtlRender = render(
        <DimensionEditor
          {...props}
          state={metricAccessorState}
          accessor={accessor}
          setState={mockSetState}
          {...overrides}
        />
      );

      const colorModeGroup = screen.queryByRole('group', { name: /Color by value/i });
      const staticColorPicker = screen.queryByTestId(SELECTORS.COLOR_PICKER);

      const typeColor = async (color: string) => {
        if (!staticColorPicker) {
          throw new Error('Static color picker not found');
        }
        await userEvent.clear(staticColorPicker);
        await userEvent.type(staticColorPicker, color);
      };

      const clearColor = async () => {
        if (!staticColorPicker) {
          throw new Error('Static color picker not found');
        }
        await userEvent.clear(staticColorPicker);
      };

      return {
        colorModeGroup,
        staticColorPicker,
        typeColor,
        clearColor,
        ...rtlRender,
      };
    }

    it('renders when the accessor matches', () => {
      renderPrimaryMetricEditor();
      expect(screen.getByTestId(SELECTORS.PRIMARY_METRIC_EDITOR)).toBeInTheDocument();
      expect(screen.queryByTestId(SELECTORS.SECONDARY_METRIC_EDITOR)).not.toBeInTheDocument();
      expect(screen.queryByTestId(SELECTORS.MAX_EDITOR)).not.toBeInTheDocument();
      expect(screen.queryByTestId(SELECTORS.BREAKDOWN_EDITOR)).not.toBeInTheDocument();
    });

    it('Color mode switch is shown when the primary metric is numeric', () => {
      const { colorModeGroup } = renderPrimaryMetricEditor();
      expect(colorModeGroup).toBeInTheDocument();
    });

    it('Color mode switch is not shown when the primary metric is non-numeric', () => {
      const { colorModeGroup } = renderPrimaryMetricEditor({
        datasource: getNonNumericDatasource(),
      });
      expect(colorModeGroup).not.toBeInTheDocument();
    });

    it('Color mode switch is not shown when the primary metric is numeric but with array support', () => {
      const { colorModeGroup } = renderPrimaryMetricEditor({
        datasource: getNumericDatasourceWithArraySupport(),
      });
      expect(colorModeGroup).not.toBeInTheDocument();
    });

    describe('static color controls', () => {
      it('is hidden when dynamic coloring is enabled', () => {
        const { staticColorPicker } = renderPrimaryMetricEditor({
          state: { ...metricAccessorState, palette },
        });
        expect(staticColorPicker).not.toBeInTheDocument();
      });
      it('is visible if palette is not defined', () => {
        const { staticColorPicker } = renderPrimaryMetricEditor({
          state: { ...metricAccessorState, palette: undefined },
        });
        expect(staticColorPicker).toBeInTheDocument();
      });
      it('is visible when metric is non-numeric even if palette is set', () => {
        const { staticColorPicker } = renderPrimaryMetricEditor({
          datasource: getNonNumericDatasource(),
          state: { ...metricAccessorState, palette },
        });
        expect(staticColorPicker).toBeInTheDocument();
      });

      it('fills with default value', () => {
        const { staticColorPicker } = renderPrimaryMetricEditor({
          state: { ...metricAccessorState, palette: undefined, color: undefined },
        });
        expect(staticColorPicker).toHaveValue(euiLightVars.euiColorPrimary.toUpperCase());
      });

      it('sets color', async () => {
        const { typeColor, clearColor } = renderPrimaryMetricEditor({
          state: { ...metricAccessorState, palette: undefined, color: faker.color.rgb() },
        });

        const newColor = faker.color.rgb().toUpperCase();
        await typeColor(newColor);
        await waitFor(() =>
          expect(mockSetState).toHaveBeenCalledWith(expect.objectContaining({ color: newColor }))
        );
        await clearColor();
        await waitFor(() =>
          expect(mockSetState).toHaveBeenCalledWith(expect.objectContaining({ color: undefined }))
        );

        expect(mockSetState).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('secondary metric dimension', () => {
    const accessor = 'secondary-metric-col-id';
    function renderSecondaryMetricEditor(overrides: Partial<Props> = {}) {
      const rtlRender = render(
        <DimensionEditor
          {...props}
          state={{ ...fullState, secondaryMetricAccessor: accessor }}
          accessor={accessor}
          {...overrides}
        />
      );

      const customPrefixGroup = screen.getByRole('group', { name: 'Prefix' });
      const getCustomPrefixTextbox = () =>
        customPrefixGroup.parentElement?.parentElement
          ? queryByRole<HTMLInputElement>(customPrefixGroup.parentElement.parentElement, 'textbox')
          : null;
      const typePrefix = async (prefix: string) => {
        const customPrefixTextbox = getCustomPrefixTextbox();
        if (customPrefixTextbox === null) {
          throw new Error('custom prefix textbox not found');
        }
        await userEvent.clear(customPrefixTextbox);
        await userEvent.type(customPrefixTextbox, prefix);
      };

      const getBaselineGroup = () => screen.getByRole('group', { name: 'Compare to' });
      const clickOnBaselineMode = async (mode: 'static' | 'primary') => {
        const baselineOption = getByTitle(getBaselineGroup(), mode, { exact: false });
        if (!baselineOption) {
          throw new Error(`Supported baseline mode ${mode} not found`);
        }
        await userEvent.click(baselineOption);
      };
      const getCustomBaselineTextbox = () => screen.queryByRole('textbox', { name: 'Baseline' });
      const typeBaseline = async (baseline: number) => {
        const customBaselineTextbox = getCustomBaselineTextbox();
        if (customBaselineTextbox == null) {
          throw new Error('custom baseline textbox not found');
        }
        await userEvent.clear(customBaselineTextbox);
        await userEvent.type(customBaselineTextbox, baseline.toString());
      };

      const getSelectedPalette = (name: string) =>
        screen.queryByRole('button', { name: new RegExp(name, 'i') });

      const colorModeGroup = screen.getByRole('group', { name: /Color by value/i });
      const clickOnColorMode = async (mode: 'none' | 'static' | 'dynamic') => {
        const colorByValueOption = getByTitle(colorModeGroup, mode, { exact: false });
        if (!colorByValueOption) {
          throw new Error(`Supported color by value ${mode} not found`);
        }
        await userEvent.click(colorByValueOption);
      };

      const getStaticColorPicker = () => screen.queryByTestId(SELECTORS.COLOR_PICKER);

      const typeColor = async (color: string) => {
        const staticColorPicker = getStaticColorPicker();
        if (!staticColorPicker) {
          throw new Error('Static color picker not found');
        }
        await userEvent.clear(staticColorPicker);
        await userEvent.type(staticColorPicker, color);
      };

      const clearColor = async () => {
        const staticColorPicker = getStaticColorPicker();
        if (!staticColorPicker) {
          throw new Error('Static color picker not found');
        }
        await userEvent.clear(staticColorPicker);
      };

      return {
        getSettingNone: () => getByTitle(customPrefixGroup, 'none', { exact: false }),
        getSettingAuto: () => getByTitle(customPrefixGroup, 'auto', { exact: false }),
        getSettingCustom: () => getByTitle(customPrefixGroup, 'custom', { exact: false }),
        getCustomPrefixTextbox,
        typePrefix,
        getSelectedPalette,
        getCustomBaselineTextbox,
        getBaselineGroup,
        typeBaseline,
        clickOnBaselineMode,
        getColorByValueNone: () => getByTitle(colorModeGroup, 'none', { exact: false }),
        getColorByValueStatic: () => getByTitle(colorModeGroup, 'static', { exact: false }),
        getColorByValueDynamic: () => getByTitle(colorModeGroup, 'dynamic', { exact: false }),
        clickOnColorMode,
        getStaticColorPicker,
        typeColor,
        clearColor,
        ...rtlRender,
      };
    }

    it('renders when the accessor matches', () => {
      renderSecondaryMetricEditor();
      expect(screen.queryByTestId(SELECTORS.PRIMARY_METRIC_EDITOR)).not.toBeInTheDocument();
      expect(screen.getByTestId(SELECTORS.SECONDARY_METRIC_EDITOR)).toBeInTheDocument();
      expect(screen.queryByTestId(SELECTORS.MAX_EDITOR)).not.toBeInTheDocument();
      expect(screen.queryByTestId(SELECTORS.BREAKDOWN_EDITOR)).not.toBeInTheDocument();
    });

    it(`doesn't break when layer data is missing`, () => {
      renderSecondaryMetricEditor({
        frame: createMockFramePublicAPI({
          activeData: { first: undefined as unknown as Datatable },
        }),
      });
      expect(screen.getByTestId(SELECTORS.SECONDARY_METRIC_EDITOR)).toBeInTheDocument();
    });

    describe('metric prefix', () => {
      const NONE_PREFIX = '';
      const AUTO_PREFIX = undefined;
      const localState = {
        ...fullState,
        secondaryPrefix: AUTO_PREFIX,
        secondaryMetricAccessor: accessor,
      };
      it('correctly renders chosen auto prefix', () => {
        const { getSettingAuto, getSettingCustom, getSettingNone, getCustomPrefixTextbox } =
          renderSecondaryMetricEditor({
            state: localState,
          });

        expect(getSettingAuto()).toHaveAttribute('aria-pressed', 'true');
        expect(getSettingNone()).toHaveAttribute('aria-pressed', 'false');
        expect(getSettingCustom()).toHaveAttribute('aria-pressed', 'false');
        expect(getCustomPrefixTextbox()).not.toBeInTheDocument();
      });

      it('correctly renders chosen none prefix', () => {
        const { getSettingAuto, getSettingCustom, getSettingNone, getCustomPrefixTextbox } =
          renderSecondaryMetricEditor({ state: { ...localState, secondaryPrefix: NONE_PREFIX } });

        expect(getSettingNone()).toHaveAttribute('aria-pressed', 'true');
        expect(getSettingAuto()).toHaveAttribute('aria-pressed', 'false');
        expect(getSettingCustom()).toHaveAttribute('aria-pressed', 'false');
        expect(getCustomPrefixTextbox()).not.toBeInTheDocument();
      });

      it('correctly renders custom prefix', () => {
        const customPrefixState = { ...localState, secondaryPrefix: faker.lorem.word(3) };
        const { getSettingAuto, getSettingCustom, getSettingNone, getCustomPrefixTextbox } =
          renderSecondaryMetricEditor({ state: customPrefixState });

        expect(getSettingAuto()).toHaveAttribute('aria-pressed', 'false');
        expect(getSettingNone()).toHaveAttribute('aria-pressed', 'false');
        expect(getSettingCustom()).toHaveAttribute('aria-pressed', 'true');
        expect(getCustomPrefixTextbox()).toHaveValue(customPrefixState.secondaryPrefix);
      });

      it('clicking on the buttons calls setState with a correct secondaryPrefix', async () => {
        const customPrefix = faker.lorem.word(3);
        const setState = jest.fn();

        const { getSettingAuto, getSettingNone } = renderSecondaryMetricEditor({
          setState,
          state: { ...localState, secondaryPrefix: customPrefix },
        });

        await userEvent.click(getSettingNone());
        expect(setState).toHaveBeenCalledWith(
          expect.objectContaining({ secondaryPrefix: NONE_PREFIX })
        );

        await userEvent.click(getSettingAuto());
        expect(setState).toHaveBeenCalledWith(
          expect.objectContaining({ secondaryPrefix: AUTO_PREFIX })
        );
      });

      it('sets a custom prefix value', async () => {
        const customPrefix = faker.lorem.word(3);
        const setState = jest.fn();

        const { typePrefix } = renderSecondaryMetricEditor({
          setState,
          state: { ...localState, secondaryPrefix: customPrefix },
        });

        const newCustomPrefix = faker.lorem.word(3);
        await typePrefix(newCustomPrefix);

        await waitFor(() =>
          expect(setState).toHaveBeenCalledWith(
            expect.objectContaining({ secondaryPrefix: newCustomPrefix })
          )
        );
      });
    });

    describe('secondary trend', () => {
      const localState = {
        ...fullState,
        secondaryMetricAccessor: accessor,
      };
      describe('coloring', () => {
        function createOperationByType(type: DataType) {
          return {
            dataType: type,
            hasTimeShift: false,
            label: 'label',
            isBucketed: false,
            hasReducedTimeRange: false,
          };
        }
        it('should show no color controls if none is selected', async () => {
          const { getColorByValueNone, getStaticColorPicker, getSelectedPalette } =
            renderSecondaryMetricEditor({
              state: { ...localState },
            });
          expect(getColorByValueNone()).toHaveAttribute('aria-pressed', 'true');
          // make sure no other color controls are shown
          expect(getStaticColorPicker()).not.toBeInTheDocument();
          expect(getSelectedPalette('Trend')).not.toBeInTheDocument();
        });

        it.each([{ mode: 'static' }, { mode: 'dynamic' }] as Array<{ mode: 'static' | 'dynamic' }>)(
          'should change the color mode to $mode',
          async ({ mode }) => {
            const setState = jest.fn();
            const { clickOnColorMode } = renderSecondaryMetricEditor({
              setState,
              state: { ...localState },
            });

            // click on the static color mode
            await clickOnColorMode(mode);

            // check for setState to be called with mode correct
            expect(setState).toHaveBeenCalledWith(
              expect.objectContaining({ secondaryTrend: getDefaultConfigForMode(mode) })
            );
          }
        );

        it('should prevent the dynamic coloring if the value type is not numeric', async () => {
          const { getColorByValueDynamic } = renderSecondaryMetricEditor({
            state: {
              ...localState,
              secondaryTrend: getDefaultConfigForMode('dynamic'),
            },
            datasource: createMockDatasource('formBased', {
              getOperationForColumnId: jest.fn((id: string) =>
                createOperationByType(id === accessor ? 'string' : 'number')
              ),
            }).publicAPIMock,
          });

          // check dynamic button to be disabled
          expect(getColorByValueDynamic()).toBeDisabled();
        });

        it('should correctly select the reversed Trend color palette based on configuration', async () => {
          const { getSelectedPalette } = renderSecondaryMetricEditor({
            state: {
              ...localState,
              secondaryTrend: {
                type: 'dynamic',
                visuals: 'both',
                reversed: true,
                paletteId: 'compare_to',
                baselineValue: 0,
              },
            },
          });

          expect(getSelectedPalette('Trend reversed')).toBeInTheDocument();
        });

        it('should disable the "Primary metric" baseline if the primary is not of number type', async () => {
          const { getBaselineGroup } = renderSecondaryMetricEditor({
            state: {
              ...localState,
              secondaryTrend: {
                type: 'dynamic',
                visuals: 'both',
                reversed: false,
                paletteId: 'compare_to',
                baselineValue: 'primary',
              },
            },
            datasource: createMockDatasource('formBased', {
              getOperationForColumnId: jest.fn((id: string) =>
                createOperationByType(id !== accessor ? 'string' : 'number')
              ),
            }).publicAPIMock,
          });

          const baselineGroup = getBaselineGroup();

          expect(baselineGroup).toBeInTheDocument();
          expect(getByTitle(baselineGroup, 'Primary metric')).toBeDisabled();
        });
      });

      it('should change the baselineValue to "primary" when changing the baseline mode from static', async () => {
        const setState = jest.fn();
        const { clickOnBaselineMode } = renderSecondaryMetricEditor({
          setState,
          state: {
            ...localState,
            secondaryTrend: {
              type: 'dynamic',
              visuals: 'both',
              reversed: false,
              paletteId: 'compare_to',
              baselineValue: 0,
            },
          },
        });

        await clickOnBaselineMode('primary');
        expect(setState).toHaveBeenCalledWith(
          expect.objectContaining({
            secondaryTrend: {
              type: 'dynamic',
              visuals: 'both',
              reversed: false,
              paletteId: 'compare_to',
              baselineValue: 'primary',
            },
          })
        );
      });

      it('should not show the baseline textbox if Primary Metric baseline is chosen', async () => {
        const { getCustomBaselineTextbox, getBaselineGroup } = renderSecondaryMetricEditor({
          state: {
            ...localState,
            secondaryTrend: {
              type: 'dynamic',
              visuals: 'both',
              reversed: false,
              paletteId: 'compare_to',
              baselineValue: 'primary',
            },
          },
        });

        expect(getByTitle(getBaselineGroup(), 'Primary metric')).toHaveAttribute(
          'aria-pressed',
          'true'
        );
        expect(getCustomBaselineTextbox()).not.toBeInTheDocument();
      });

      it('should set a default prefix if auto is set and Primary Metric is chosen', async () => {
        const { getCustomPrefixTextbox, getBaselineGroup } = renderSecondaryMetricEditor({
          state: {
            ...localState,
            secondaryPrefix: undefined,
            secondaryTrend: {
              type: 'dynamic',
              visuals: 'both',
              reversed: false,
              paletteId: 'compare_to',
              baselineValue: 'primary',
            },
          },
        });

        expect(getByTitle(getBaselineGroup(), 'Primary metric')).toHaveAttribute(
          'aria-pressed',
          'true'
        );
        const el = getCustomPrefixTextbox();
        if (el == null) {
          fail('Prefix textbox not in view');
        }
        expect(el.value).toBe('Difference');
      });

      it.each([
        // mind that auto gets converted into {name: 'custom', value: 'Difference'}
        { name: 'auto', value: undefined },
        { name: 'none', value: '' },
        { name: 'custom', value: 'customPrefix' },
      ])(
        'should preserve the current prefix is set to $name and Primary Metric is chosen',
        async ({ name, value }) => {
          const {
            getCustomPrefixTextbox,
            getBaselineGroup,
            getSettingAuto,
            getSettingCustom,
            getSettingNone,
          } = renderSecondaryMetricEditor({
            state: {
              ...localState,
              secondaryPrefix: value,
              secondaryTrend: {
                type: 'dynamic',
                visuals: 'both',
                reversed: false,
                paletteId: 'compare_to',
                baselineValue: 'primary',
              },
            },
          });

          expect(getByTitle(getBaselineGroup(), 'Primary metric')).toHaveAttribute(
            'aria-pressed',
            'true'
          );

          expect(getSettingAuto()).toHaveAttribute('aria-pressed', `false`);
          expect(getSettingNone()).toHaveAttribute('aria-pressed', `${name === 'none'}`);
          // When primary is chosen auto gets converted into Custom with the default 'Difference' prefix
          expect(getSettingCustom()).toHaveAttribute(
            'aria-pressed',
            `${name === 'custom' || name === 'auto'}`
          );

          if (value || name === 'auto') {
            const el = getCustomPrefixTextbox();
            if (el == null) {
              fail('Prefix textbox not in view');
            }
            expect(el.value).toBe(value ?? 'Difference');
          }
        }
      );
    });
  });

  describe('maximum dimension', () => {
    function renderMaximumDimension(overrides = {}) {
      const accessor = 'max-col-id';
      return render(
        <DimensionEditor
          {...props}
          accessor={accessor}
          state={{ ...fullState, maxAccessor: accessor }}
          {...overrides}
        />
      );
    }

    it('renders when the accessor matches', () => {
      renderMaximumDimension();
      expect(screen.queryByTestId(SELECTORS.PRIMARY_METRIC_EDITOR)).not.toBeInTheDocument();
      expect(screen.queryByTestId(SELECTORS.SECONDARY_METRIC_EDITOR)).not.toBeInTheDocument();
      expect(screen.getByTestId(SELECTORS.MAX_EDITOR)).toBeInTheDocument();
      expect(screen.queryByTestId(SELECTORS.BREAKDOWN_EDITOR)).not.toBeInTheDocument();
    });
  });

  describe('breakdown-by dimension', () => {
    const accessor = 'breakdown-col-id';

    const mockSetState = jest.fn();

    afterEach(() => mockSetState.mockClear());

    function renderBreakdownEditor(overrides = {}) {
      const rtlRender = render(
        <DimensionEditor
          {...props}
          state={{ ...fullState, breakdownByAccessor: accessor }}
          accessor={accessor}
          setState={mockSetState}
          {...overrides}
        />
      );

      const setMaxCols = async (maxCols: number) => {
        const maxColsInput = screen.getByLabelText(/layout columns/i);
        await userEvent.clear(maxColsInput);
        await userEvent.type(maxColsInput, maxCols.toString());
      };

      return {
        ...rtlRender,
        setMaxCols,
        rerender: (newOverrides = {}) => {
          rtlRender.rerender(
            <DimensionEditor
              {...props}
              state={{ ...fullState, breakdownByAccessor: accessor }}
              accessor={accessor}
              setState={mockSetState}
              {...newOverrides}
            />
          );
        },
      };
    }

    it('renders when the accessor matches', () => {
      renderBreakdownEditor();
      expect(screen.queryByTestId(SELECTORS.PRIMARY_METRIC_EDITOR)).not.toBeInTheDocument();
      expect(screen.queryByTestId(SELECTORS.SECONDARY_METRIC_EDITOR)).not.toBeInTheDocument();
      expect(screen.queryByTestId(SELECTORS.MAX_EDITOR)).not.toBeInTheDocument();
      expect(screen.queryByTestId(SELECTORS.BREAKDOWN_EDITOR)).toBeInTheDocument();
    });

    it('sets max columns', async () => {
      const { setMaxCols } = renderBreakdownEditor();
      await setMaxCols(1);
      await waitFor(() =>
        expect(mockSetState).toHaveBeenCalledWith(expect.objectContaining({ maxCols: 1 }))
      );
      await setMaxCols(2);
      await waitFor(() =>
        expect(mockSetState).toHaveBeenCalledWith(expect.objectContaining({ maxCols: 2 }))
      );
      await setMaxCols(3);
      await waitFor(() =>
        expect(mockSetState).toHaveBeenCalledWith(expect.objectContaining({ maxCols: 3 }))
      );
    });

    describe('data section', () => {
      function renderBreakdownEditorDataSection(overrides = {}) {
        const rtlRender = render(
          <DimensionEditorDataExtraComponent
            {...props}
            groupId={GROUP_ID.BREAKDOWN_BY}
            state={{ ...fullState, breakdownByAccessor: accessor }}
            accessor={accessor}
            setState={mockSetState}
            {...overrides}
          />
        );

        const selectCollapseBy = async (collapseFn: string) => {
          const collapseBySelect = screen.getByLabelText(/collapse by/i);
          await userEvent.selectOptions(collapseBySelect, collapseFn);
        };

        return {
          ...rtlRender,
          selectCollapseBy,
          rerender: (newOverrides = {}) => {
            rtlRender.rerender(
              <DimensionEditorDataExtraComponent
                {...props}
                groupId={GROUP_ID.BREAKDOWN_BY}
                state={{ ...fullState, breakdownByAccessor: accessor }}
                accessor={accessor}
                setState={mockSetState}
                {...newOverrides}
              />
            );
          },
        };
      }

      it('supports setting a collapse function', async () => {
        const { selectCollapseBy } = renderBreakdownEditorDataSection();
        const newCollapseFn = 'min';
        await selectCollapseBy(newCollapseFn);

        expect(mockSetState).toHaveBeenCalledWith({ ...fullState, collapseFn: newCollapseFn });
      });

      it('should not display the collapse function if the primary metric is not numeric', async () => {
        const { rerender, container } = renderBreakdownEditorDataSection({
          datasource: getNonNumericDatasource(),
        });

        expect(container).toBeEmptyDOMElement();

        // now rerender with a numeric metric
        rerender({ datasource: props.datasource });
        expect(screen.getByLabelText(/collapse by/i)).toBeInTheDocument();
      });

      it.each([[GROUP_ID.METRIC], [GROUP_ID.SECONDARY_METRIC], [GROUP_ID.MAX]])(
        'should not render for other group types: %s',
        async (groupId) => {
          const { container } = renderBreakdownEditorDataSection({ groupId });
          expect(container).toBeEmptyDOMElement();
        }
      );
    });
  });

  describe('additional section', () => {
    const accessor = 'metric-col-id';
    const metricAccessorState = { ...fullState, metricAccessor: accessor };
    const mockSetState = jest.fn();

    afterEach(() => mockSetState.mockClear());

    function renderAdditionalSectionEditor(overrides = {}) {
      const rtlRender = render(
        <DimensionEditorAdditionalSection
          {...props}
          setState={mockSetState}
          state={metricAccessorState}
          accessor={accessor}
          {...overrides}
        />
      );

      const supportingVisOptions = {
        none: screen.queryByTitle(/none/i),
        // in eui when bar or line become disabled they change from input to button so we have to do this weird check
        bar: screen.queryByTitle(/bar/i) || screen.queryByRole('button', { name: /bar/i }),
        trendline: screen.queryByTitle(/line/i) || screen.queryByRole('button', { name: /line/i }),
      };

      const clickOnSupportingVis = async (type: SupportingVisType) => {
        const supportingVis = supportingVisOptions[type];
        if (!supportingVis) {
          throw new Error(`Supporting visualization ${type} not found`);
        }
        await userEvent.click(supportingVis);
      };

      return {
        progressDirectionShowing: screen.queryByTestId('lnsMetric_progress_direction_buttons'),
        progressOptions: {
          vertical: screen.queryByTitle(/vertical/i),
          horizontal: screen.queryByTitle(/horizontal/i),
        },
        supportingVisOptions,
        clickOnSupportingVis,
        ...rtlRender,
      };
    }

    it.each([
      { name: 'secondary metric', accessor: metricAccessorState.secondaryMetricAccessor },
      { name: 'max', accessor: metricAccessorState.maxAccessor },
      { name: 'break down by', accessor: metricAccessorState.breakdownByAccessor },
    ])('doesnt show for the following dimension: %s', ({ accessor: testAccessor }) => {
      const { container } = renderAdditionalSectionEditor({ accessor: testAccessor });
      expect(container).toBeEmptyDOMElement();
    });

    describe('supporting visualizations', () => {
      const stateWOTrend = {
        ...metricAccessorState,
        trendlineLayerId: undefined,
      };

      describe('reflecting visualization state', () => {
        it('when `showBar` is false and maximum value is not defined, option none should be selected', () => {
          const { supportingVisOptions } = renderAdditionalSectionEditor({
            state: { ...stateWOTrend, showBar: false, maxAccessor: undefined },
          });
          expect(supportingVisOptions.none).toHaveAttribute('aria-pressed', 'true');
        });

        it('when `showBar` is true and maximum value is not defined, bar should be selected', () => {
          const { supportingVisOptions } = renderAdditionalSectionEditor({
            state: { ...stateWOTrend, showBar: true },
          });
          expect(supportingVisOptions.bar).toHaveAttribute('aria-pressed', 'true');
        });

        it('when `showBar` is true and trendline is defined, line should be selected', () => {
          const { supportingVisOptions } = renderAdditionalSectionEditor({
            state: metricAccessorState,
          });
          expect(supportingVisOptions.trendline).toHaveAttribute('aria-pressed', 'true');
        });

        it('should enable bar when max dimension exists', () => {
          const { supportingVisOptions } = renderAdditionalSectionEditor({
            state: {
              ...stateWOTrend,
              showBar: false,
              maxAccessor: 'something',
            },
          });
          expect(supportingVisOptions.bar).not.toBeDisabled();
        });

        it('should disable bar when max dimension does not exist', () => {
          const { supportingVisOptions } = renderAdditionalSectionEditor({
            state: {
              ...stateWOTrend,
              showBar: false,
              maxAccessor: undefined,
            },
          });
          expect(supportingVisOptions.bar).toBeDisabled();
        });

        it('should disable trendline when no default time field', () => {
          const { supportingVisOptions } = renderAdditionalSectionEditor({
            datasource: {
              ...props.datasource,
              hasDefaultTimeField: () => false,
            },
          });
          expect(supportingVisOptions.trendline).toBeDisabled();
        });

        it('should enable trendline when default time field exists', () => {
          const { supportingVisOptions } = renderAdditionalSectionEditor();
          expect(supportingVisOptions.trendline).not.toBeDisabled();
        });
      });

      it('should disable trendline when a metric dimension has a reduced time range', () => {
        const { supportingVisOptions } = renderAdditionalSectionEditor({
          datasource: {
            ...props.datasource,
            getOperationForColumnId: (id: string) => ({
              hasReducedTimeRange: id === stateWOTrend.metricAccessor,
              dataType: 'number',
            }),
          },
        });
        expect(supportingVisOptions.trendline).toBeDisabled();
      });

      it('should not show a trendline button group when primary metric dimension is non-numeric', () => {
        const { container } = renderAdditionalSectionEditor({
          datasource: getNonNumericDatasource(),
        });
        expect(container).toBeEmptyDOMElement();
      });

      describe('responding to buttons', () => {
        it('enables trendline', async () => {
          const { clickOnSupportingVis } = renderAdditionalSectionEditor({ state: stateWOTrend });
          await clickOnSupportingVis('trendline');

          expect(mockSetState).toHaveBeenCalledWith({ ...stateWOTrend, showBar: false });
          expect(props.addLayer).toHaveBeenCalledWith('metricTrendline');
          expectCalledBefore(mockSetState, props.addLayer as jest.Mock);
        });

        it('enables bar', async () => {
          const { clickOnSupportingVis } = renderAdditionalSectionEditor({
            state: metricAccessorState,
          });
          await clickOnSupportingVis('bar');

          expect(mockSetState).toHaveBeenCalledWith({ ...metricAccessorState, showBar: true });
          expect(props.removeLayer).toHaveBeenCalledWith(metricAccessorState.trendlineLayerId);

          expectCalledBefore(mockSetState, props.removeLayer as jest.Mock);
        });

        it('selects none from bar', async () => {
          const { clickOnSupportingVis } = renderAdditionalSectionEditor({
            state: stateWOTrend,
          });
          await clickOnSupportingVis('none');

          expect(mockSetState).toHaveBeenCalledWith({ ...stateWOTrend, showBar: false });
          expect(props.removeLayer).not.toHaveBeenCalled();
        });

        it('selects none from trendline', async () => {
          const { clickOnSupportingVis } = renderAdditionalSectionEditor({
            state: metricAccessorState,
          });
          await clickOnSupportingVis('none');

          expect(mockSetState).toHaveBeenCalledWith({ ...metricAccessorState, showBar: false });
          expect(props.removeLayer).toHaveBeenCalledWith(metricAccessorState.trendlineLayerId);

          expectCalledBefore(mockSetState, props.removeLayer as jest.Mock);
        });
      });

      describe('progress bar direction controls', () => {
        it('hides direction controls if bar not showing', () => {
          const { progressDirectionShowing } = renderAdditionalSectionEditor({
            state: { ...stateWOTrend, showBar: false },
          });
          expect(progressDirectionShowing).not.toBeInTheDocument();
        });

        it('toggles progress direction', async () => {
          const { progressOptions } = renderAdditionalSectionEditor({
            state: metricAccessorState,
          });

          expect(progressOptions.vertical).toHaveAttribute('aria-pressed', 'true');
          expect(progressOptions.horizontal).toHaveAttribute('aria-pressed', 'false');
          if (progressOptions.horizontal === null) {
            throw new Error('horizontal button not found');
          }

          await userEvent.click(progressOptions.horizontal);

          expect(mockSetState).toHaveBeenCalledWith({
            ...metricAccessorState,
            progressDirection: 'horizontal',
          });
        });
      });
    });
  });
});
