/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import DateMath from '@elastic/datemath';
import {
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiKeyboardAccessible,
  EuiLoadingSpinner,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiProgress,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { npStart } from 'ui/new_platform';
import { EUI_CHARTS_THEME_DARK, EUI_CHARTS_THEME_LIGHT } from '@elastic/eui/dist/eui_charts_theme';
import {
  Axis,
  BarSeries,
  Chart,
  niceTimeFormatter,
  Position,
  ScaleType,
  Settings,
  TooltipType,
} from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import {
  Query,
  KBN_FIELD_TYPES,
  ES_FIELD_TYPES,
  esFilters,
  esQuery,
  IIndexPattern,
} from '../../../../../../src/plugins/data/public';
import { DraggedField } from './indexpattern';
import { DragDrop } from '../drag_drop';
import { DatasourceDataPanelProps, DataType } from '../types';
import { BucketedAggregation, FieldStatsResponse } from '../../common';
import { IndexPattern, IndexPatternField } from './types';
import { getColorForDataType, LensFieldIcon } from './lens_field_icon';
import { trackUiEvent } from '../lens_ui_telemetry';

export interface FieldItemProps {
  core: DatasourceDataPanelProps['core'];
  field: IndexPatternField;
  indexPattern: IndexPattern;
  highlight?: string;
  exists: boolean;
  query: Query;
  dateRange: DatasourceDataPanelProps['dateRange'];
  filters: esFilters.Filter[];
  hideDetails?: boolean;
}

interface State {
  isLoading: boolean;
  totalDocuments?: number;
  sampledDocuments?: number;
  sampledValues?: number;
  histogram?: BucketedAggregation<number | string>;
  topValues?: BucketedAggregation<number | string>;
}

function wrapOnDot(str?: string) {
  // u200B is a non-width white-space character, which allows
  // the browser to efficiently word-wrap right after the dot
  // without us having to draw a lot of extra DOM elements, etc
  return str ? str.replace(/\./g, '.\u200B') : '';
}

export function FieldItem(props: FieldItemProps) {
  const {
    core,
    field,
    indexPattern,
    highlight,
    exists,
    query,
    dateRange,
    filters,
    hideDetails,
  } = props;

  const [infoIsOpen, setOpen] = useState(false);

  const [state, setState] = useState<State>({
    isLoading: false,
  });

  const wrappableName = wrapOnDot(field.name)!;
  const wrappableHighlight = wrapOnDot(highlight);
  const highlightIndex = wrappableHighlight
    ? wrappableName.toLowerCase().indexOf(wrappableHighlight.toLowerCase())
    : -1;
  const wrappableHighlightableFieldName =
    highlightIndex < 0 ? (
      wrappableName
    ) : (
      <span>
        <span>{wrappableName.substr(0, highlightIndex)}</span>
        <strong>{wrappableName.substr(highlightIndex, wrappableHighlight.length)}</strong>
        <span>{wrappableName.substr(highlightIndex + wrappableHighlight.length)}</span>
      </span>
    );

  function fetchData() {
    if (
      state.isLoading ||
      (field.type !== 'number' &&
        field.type !== 'string' &&
        field.type !== 'date' &&
        field.type !== 'boolean' &&
        field.type !== 'ip')
    ) {
      return;
    }

    setState(s => ({ ...s, isLoading: true }));

    core.http
      .post(`/api/lens/index_stats/${indexPattern.title}/field`, {
        body: JSON.stringify({
          dslQuery: esQuery.buildEsQuery(
            indexPattern as IIndexPattern,
            query,
            filters,
            esQuery.getEsQueryConfig(core.uiSettings)
          ),
          fromDate: dateRange.fromDate,
          toDate: dateRange.toDate,
          timeFieldName: indexPattern.timeFieldName,
          field,
        }),
      })
      .then((results: FieldStatsResponse<string | number>) => {
        setState(s => ({
          ...s,
          isLoading: false,
          totalDocuments: results.totalDocuments,
          sampledDocuments: results.sampledDocuments,
          sampledValues: results.sampledValues,
          histogram: results.histogram,
          topValues: results.topValues,
        }));
      })
      .catch(() => {
        setState(s => ({ ...s, isLoading: false }));
      });
  }

  function togglePopover() {
    if (hideDetails) {
      return;
    }

    setOpen(!infoIsOpen);
    if (!infoIsOpen) {
      trackUiEvent('indexpattern_field_info_click');
      fetchData();
    }
  }

  return (
    <EuiPopover
      id="lnsFieldListPanel__field"
      className="lnsFieldItem__popoverAnchor"
      display="block"
      container={document.querySelector<HTMLElement>('.application') || undefined}
      button={
        <DragDrop
          value={{ field, indexPatternId: indexPattern.id } as DraggedField}
          data-test-subj="lnsFieldListPanelField"
          draggable
          className={`lnsFieldItem lnsFieldItem--${field.type} lnsFieldItem--${
            exists ? 'exists' : 'missing'
          }`}
        >
          <EuiKeyboardAccessible>
            <div
              className={`lnsFieldItem__info ${infoIsOpen ? 'lnsFieldItem__info-isOpen' : ''}`}
              data-test-subj={`lnsFieldListPanelField-${field.name}`}
              onClick={() => {
                togglePopover();
              }}
              onKeyPress={event => {
                if (event.key === 'ENTER') {
                  togglePopover();
                }
              }}
              aria-label={i18n.translate('xpack.lens.indexPattern.fieldStatsButtonLabel', {
                defaultMessage: 'Click for a field preview, or drag and drop to visualize.',
              })}
            >
              <LensFieldIcon type={field.type as DataType} />

              <span className="lnsFieldItem__name" title={field.name}>
                {wrappableHighlightableFieldName}
              </span>

              <EuiIconTip
                anchorClassName="lnsFieldItem__infoIcon"
                content={
                  hideDetails
                    ? i18n.translate('xpack.lens.indexPattern.fieldItemTooltip', {
                        defaultMessage: 'Drag and drop to visualize.',
                      })
                    : i18n.translate('xpack.lens.indexPattern.fieldStatsButtonLabel', {
                        defaultMessage: 'Click for a field preview, or drag and drop to visualize.',
                      })
                }
                type="iInCircle"
                color="subdued"
                size="s"
              />
            </div>
          </EuiKeyboardAccessible>
        </DragDrop>
      }
      isOpen={infoIsOpen}
      closePopover={() => setOpen(false)}
      anchorPosition="rightUp"
      panelClassName="lnsFieldItem__fieldPopoverPanel"
    >
      <FieldItemPopoverContents {...state} {...props} />
    </EuiPopover>
  );
}

function FieldItemPopoverContents(props: State & FieldItemProps) {
  const fieldFormats = npStart.plugins.data.fieldFormats;
  const { histogram, topValues, indexPattern, field, dateRange, core, sampledValues } = props;

  const IS_DARK_THEME = core.uiSettings.get('theme:darkMode');
  const chartTheme = IS_DARK_THEME ? EUI_CHARTS_THEME_DARK.theme : EUI_CHARTS_THEME_LIGHT.theme;

  if (props.isLoading) {
    return <EuiLoadingSpinner />;
  } else if (
    (!props.histogram || props.histogram.buckets.length === 0) &&
    (!props.topValues || props.topValues.buckets.length === 0)
  ) {
    return (
      <EuiText size="s">
        {i18n.translate('xpack.lens.indexPattern.fieldStatsNoData', {
          defaultMessage: 'No data to display.',
        })}
      </EuiText>
    );
  }

  let histogramDefault = !!props.histogram;

  const totalValuesCount =
    topValues && topValues.buckets.reduce((prev, bucket) => bucket.count + prev, 0);
  const otherCount = sampledValues && totalValuesCount ? sampledValues - totalValuesCount : 0;

  if (
    totalValuesCount &&
    histogram &&
    histogram.buckets.length &&
    topValues &&
    topValues.buckets.length
  ) {
    // Default to histogram when top values are less than 10% of total
    histogramDefault = otherCount / totalValuesCount > 0.9;
  }

  const [showingHistogram, setShowingHistogram] = useState(histogramDefault);

  let formatter: { convert: (data: unknown) => string };
  if (indexPattern.fieldFormatMap && indexPattern.fieldFormatMap[field.name]) {
    const FormatType = fieldFormats.getType(indexPattern.fieldFormatMap[field.name].id);
    if (FormatType) {
      formatter = new FormatType(
        indexPattern.fieldFormatMap[field.name].params,
        core.uiSettings.get.bind(core.uiSettings)
      );
    } else {
      formatter = { convert: (data: unknown) => JSON.stringify(data) };
    }
  } else {
    formatter = fieldFormats.getDefaultInstance(
      field.type as KBN_FIELD_TYPES,
      field.esTypes as ES_FIELD_TYPES[]
    );
  }

  const euiButtonColor =
    field.type === 'string' ? 'accent' : field.type === 'number' ? 'secondary' : 'primary';
  const euiTextColor =
    field.type === 'string' ? 'accent' : field.type === 'number' ? 'secondary' : 'default';

  const fromDate = DateMath.parse(dateRange.fromDate);
  const toDate = DateMath.parse(dateRange.toDate);

  let title = <></>;

  if (histogram && histogram.buckets.length && topValues && topValues.buckets.length) {
    title = (
      <EuiButtonGroup
        className="lnsFieldItem__popoverButtonGroup"
        buttonSize="compressed"
        isFullWidth
        legend={i18n.translate('xpack.lens.indexPattern.fieldStatsDisplayToggle', {
          defaultMessage: 'Toggle either the',
        })}
        options={[
          {
            label: i18n.translate('xpack.lens.indexPattern.fieldTopValuesLabel', {
              defaultMessage: 'Top values',
            }),
            id: 'topValues',
          },
          {
            label: i18n.translate('xpack.lens.indexPattern.fieldDistributionLabel', {
              defaultMessage: 'Distribution',
            }),
            id: 'histogram',
          },
        ]}
        onChange={optionId => {
          setShowingHistogram(optionId === 'histogram');
        }}
        idSelected={showingHistogram ? 'histogram' : 'topValues'}
      />
    );
  } else if (field.type === 'date') {
    title = (
      <>
        {i18n.translate('xpack.lens.indexPattern.fieldTimeDistributionLabel', {
          defaultMessage: 'Time distribution',
        })}
      </>
    );
  } else if (topValues && topValues.buckets.length) {
    title = (
      <>
        {i18n.translate('xpack.lens.indexPattern.fieldTopValuesLabel', {
          defaultMessage: 'Top values',
        })}
      </>
    );
  }

  function wrapInPopover(el: React.ReactElement) {
    return (
      <>
        {title ? <EuiPopoverTitle>{title}</EuiPopoverTitle> : <></>}
        {el}

        {props.totalDocuments ? (
          <EuiPopoverFooter>
            <EuiText size="xs" textAlign="center">
              {props.sampledDocuments && (
                <>
                  {i18n.translate('xpack.lens.indexPattern.percentageOfLabel', {
                    defaultMessage: '{percentage}% of',
                    values: {
                      percentage: Math.round((props.sampledDocuments / props.totalDocuments) * 100),
                    },
                  })}
                </>
              )}{' '}
              <strong>
                {fieldFormats
                  .getDefaultInstance(KBN_FIELD_TYPES.NUMBER, [ES_FIELD_TYPES.INTEGER])
                  .convert(props.totalDocuments)}
              </strong>{' '}
              {i18n.translate('xpack.lens.indexPattern.ofDocumentsLabel', {
                defaultMessage: 'documents',
              })}
            </EuiText>
          </EuiPopoverFooter>
        ) : (
          <></>
        )}
      </>
    );
  }

  if (histogram && histogram.buckets.length) {
    const specId = i18n.translate('xpack.lens.indexPattern.fieldStatsCountLabel', {
      defaultMessage: 'Count',
    });
    const expectedColor = getColorForDataType(field.type);
    const seriesColors = expectedColor ? [expectedColor] : undefined;

    if (field.type === 'date') {
      return wrapInPopover(
        <Chart data-test-subj="lnsFieldListPanel-histogram" size={{ height: 200, width: 300 - 32 }}>
          <Settings
            tooltip={{ type: TooltipType.None }}
            theme={chartTheme}
            xDomain={
              fromDate && toDate
                ? {
                    min: fromDate.valueOf(),
                    max: toDate.valueOf(),
                    minInterval: Math.round((toDate.valueOf() - fromDate.valueOf()) / 10),
                  }
                : undefined
            }
          />

          <Axis
            id="key"
            position={Position.Bottom}
            tickFormat={
              fromDate && toDate
                ? niceTimeFormatter([fromDate.valueOf(), toDate.valueOf()])
                : undefined
            }
            showOverlappingTicks={true}
          />

          <BarSeries
            data={histogram.buckets}
            id={specId}
            xAccessor={'key'}
            yAccessors={['count']}
            xScaleType={ScaleType.Time}
            yScaleType={ScaleType.Linear}
            customSeriesColors={seriesColors}
            timeZone="local"
          />
        </Chart>
      );
    } else if (showingHistogram || !topValues || !topValues.buckets.length) {
      return wrapInPopover(
        <Chart data-test-subj="lnsFieldListPanel-histogram" size={{ height: 200, width: '100%' }}>
          <Settings rotation={90} tooltip={{ type: TooltipType.None }} theme={chartTheme} />

          <Axis
            id="key"
            position={Position.Left}
            showOverlappingTicks={true}
            tickFormat={d => formatter.convert(d)}
          />

          <BarSeries
            data={histogram.buckets}
            id={specId}
            xAccessor={'key'}
            yAccessors={['count']}
            xScaleType={ScaleType.Linear}
            yScaleType={ScaleType.Linear}
            customSeriesColors={seriesColors}
          />
        </Chart>
      );
    }
  }

  if (props.topValues && props.topValues.buckets.length) {
    return wrapInPopover(
      <div data-test-subj="lnsFieldListPanel-topValues">
        {props.topValues.buckets.map(topValue => {
          const formatted = formatter.convert(topValue.key);
          return (
            <div className="lnsFieldItem__topValue" key={topValue.key}>
              <EuiFlexGroup alignItems="stretch" key={topValue.key} gutterSize="xs">
                <EuiFlexItem grow={true} className="eui-textTruncate">
                  {formatted === '' ? (
                    <EuiText size="xs" color="subdued">
                      <em>
                        {i18n.translate('xpack.lens.indexPattern.fieldPanelEmptyStringValue', {
                          defaultMessage: 'Empty string',
                        })}
                      </em>
                    </EuiText>
                  ) : (
                    <EuiToolTip content={formatted} delay="long">
                      <EuiText size="xs" color="subdued" className="eui-textTruncate">
                        {formatted}
                      </EuiText>
                    </EuiToolTip>
                  )}
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" textAlign="left" color={euiTextColor}>
                    {Math.round((topValue.count / props.sampledValues!) * 100)}%
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>

              <EuiProgress
                className="lnsFieldItem__topValueProgress"
                value={topValue.count / props.sampledValues!}
                max={1}
                size="s"
                color={euiButtonColor}
              />
            </div>
          );
        })}
        {otherCount ? (
          <>
            <EuiFlexGroup alignItems="stretch" gutterSize="xs">
              <EuiFlexItem grow={true} className="eui-textTruncate">
                <EuiText size="xs" className="eui-textTruncate" color="subdued">
                  {i18n.translate('xpack.lens.indexPattern.otherDocsLabel', {
                    defaultMessage: 'Other',
                  })}
                </EuiText>
              </EuiFlexItem>

              <EuiFlexItem grow={false} className="eui-textTruncate">
                <EuiText size="s" color="subdued">
                  {Math.round((otherCount / props.sampledValues!) * 100)}%
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiProgress
              className="lnsFieldItem__topValueProgress"
              value={otherCount / props.sampledValues!}
              max={1}
              size="s"
              color="subdued"
            />
          </>
        ) : (
          <></>
        )}
      </div>
    );
  }
  return <></>;
}
