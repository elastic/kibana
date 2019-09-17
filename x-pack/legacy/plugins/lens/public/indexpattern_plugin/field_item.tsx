/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiProgress,
  EuiPopover,
  EuiLoadingSpinner,
  EuiKeyboardAccessible,
  EuiText,
  EuiToolTip,
  EuiButtonGroup,
  EuiSpacer,
  EuiPopoverFooter,
  EuiPopoverTitle,
} from '@elastic/eui';
import {
  Chart,
  Axis,
  getAxisId,
  getSpecId,
  BarSeries,
  Position,
  ScaleType,
  Settings,
  DataSeriesColorsValues,
  TooltipType,
  niceTimeFormatter,
} from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import { toElasticsearchQuery } from '@kbn/es-query';
import { Query } from 'src/plugins/data/common';
// @ts-ignore
import { fieldFormats } from '../../../../../../src/legacy/ui/public/registry/field_formats';
import { IndexPattern, IndexPatternField, DraggedField } from './indexpattern';
import { DragDrop } from '../drag_drop';
import { FieldIcon, getColorForDataType } from './field_icon';
import { DatasourceDataPanelProps, DataType } from '../types';
import { BucketedAggregation, FieldStatsResponse } from '../../common';

export interface FieldItemProps {
  core: DatasourceDataPanelProps['core'];
  field: IndexPatternField;
  indexPattern: IndexPattern;
  highlight?: string;
  exists: boolean;
  query: Query;
  dateRange: DatasourceDataPanelProps['dateRange'];
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

export function FieldItem({
  core,
  field,
  indexPattern,
  highlight,
  exists,
  query,
  dateRange,
}: FieldItemProps) {
  const [infoIsOpen, setOpen] = useState(false);
  const [showingHistogram, setShowingHistogram] = useState(true);

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
    formatter = fieldFormats.getDefaultInstance(field.type, field.esTypes);
  }

  function fetchData() {
    if (
      state.isLoading ||
      (field.type !== 'number' &&
        field.type !== 'string' &&
        field.type !== 'date' &&
        field.type !== 'boolean')
    ) {
      return;
    }

    setState(s => ({ ...s, isLoading: true }));

    core.http
      .post(`/api/lens/index_stats/${indexPattern.title}/field`, {
        body: JSON.stringify({
          query: toElasticsearchQuery(query, indexPattern),
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

        if (
          results.histogram &&
          results.histogram.buckets.length &&
          results.topValues &&
          results.topValues.buckets.length
        ) {
          const count = results.sampledValues || results.sampledDocuments || results.totalDocuments;
          const totalValuesCount =
            results.topValues &&
            results.topValues.buckets.reduce((prev, bucket) => bucket.count + prev, 0);
          const otherCount = count && totalValuesCount ? count - totalValuesCount : 0;
          // Default to histogram when top values are less than 10% of total
          setShowingHistogram(otherCount / totalValuesCount > 0.9);
        } else {
          setShowingHistogram(!!results.histogram);
        }
      })
      .catch(() => {
        setState(s => ({ ...s, isLoading: false }));
      });
  }

  const specId = getSpecId(
    i18n.translate('xpack.lens.indexPattern.fieldStatsCountLabel', {
      defaultMessage: 'Count',
    })
  );
  const expectedColor = getColorForDataType(field.type);
  const colors: DataSeriesColorsValues = {
    colorValues: [],
    specId,
  };
  const seriesColors = new Map([[colors, expectedColor]]);

  const bucketedValuesCount =
    state.topValues && state.topValues.buckets.reduce((prev, bucket) => bucket.count + prev, 0);
  const otherCount =
    state.sampledValues && bucketedValuesCount ? state.sampledValues - bucketedValuesCount : 0;

  const euiButtonColor =
    field.type === 'string' ? 'accent' : field.type === 'number' ? 'secondary' : 'primary';
  const euiTextColor =
    field.type === 'string' ? 'accent' : field.type === 'number' ? 'secondary' : 'default';

  function togglePopover() {
    setOpen(!infoIsOpen);
    if (!infoIsOpen) {
      fetchData();
    }
  }

  return (
    <EuiPopover
      id="lnsFieldListPanel__field"
      display="block"
      container={document.querySelector<HTMLElement>('.application') || undefined}
      button={
        <DragDrop
          value={{ field, indexPatternId: indexPattern.id } as DraggedField}
          data-test-subj="lnsFieldListPanelField"
          draggable
          className={`lnsFieldListPanel__field lnsFieldListPanel__field-btn-${
            field.type
          } lnsFieldListPanel__field--${exists ? 'exists' : 'missing'}`}
        >
          <EuiKeyboardAccessible>
            <div
              className="lnsFieldListPanel__fieldInfo"
              data-test-subj={`lnsFieldListPanelField-${field.name}`}
              onClick={() => {
                togglePopover();
              }}
              onKeyPress={event => {
                if (event.key === 'ENTER') {
                  togglePopover();
                }
              }}
              title={i18n.translate('xpack.lens.indexPattern.fieldStatsButton', {
                defaultMessage: 'Click or Enter for more information about {fieldName}',
                values: { fieldName: field.name },
              })}
              aria-label={i18n.translate('xpack.lens.indexPattern.fieldStatsButton', {
                defaultMessage: 'Click or Enter for more information about {fieldName}',
                values: { fieldName: field.name },
              })}
            >
              <FieldIcon type={field.type as DataType} />

              <span className="lnsFieldListPanel__fieldName" title={field.name}>
                {wrappableHighlightableFieldName}
              </span>
            </div>
          </EuiKeyboardAccessible>
        </DragDrop>
      }
      isOpen={infoIsOpen}
      closePopover={() => setOpen(false)}
      anchorPosition="rightUp"
      panelClassName="lnsFieldListPanel__fieldPopover"
    >
      <div>
        {state.isLoading && <EuiLoadingSpinner />}

        {state.histogram &&
          state.histogram.buckets.length &&
          state.topValues &&
          state.topValues.buckets.length && (
            <>
              <EuiButtonGroup
                buttonSize="s"
                legend={i18n.translate('xpack.lens.indexPattern.fieldStatsDisplayToggle', {
                  defaultMessage: 'Toggle either the',
                })}
                options={[
                  {
                    label: i18n.translate('xpack.lens.indexPattern.fieldTopValuesLabel', {
                      defaultMessage: 'Top Values',
                    }),
                    id: 'topValues',
                  },
                  {
                    label: i18n.translate('xpack.lens.indexPattern.fieldHistogramLabel', {
                      defaultMessage: 'Histogram',
                    }),
                    id: 'histogram',
                  },
                ]}
                onChange={optionId => {
                  setShowingHistogram(optionId === 'histogram');
                }}
                idSelected={showingHistogram ? 'histogram' : 'topValues'}
              />
              <EuiSpacer />
            </>
          )}

        {state.histogram && (!state.topValues || showingHistogram) && (
          <Chart className="lnsDistributionChart" data-test-subj="lnsFieldListPanel-histogram">
            <Settings
              rotation={field.type === 'date' ? 0 : 90}
              tooltip={{ type: TooltipType.None }}
            />

            <Axis
              id={getAxisId('key')}
              position={field.type === 'date' ? Position.Bottom : Position.Left}
              tickFormat={
                field.type === 'date'
                  ? niceTimeFormatter([
                      state.histogram.buckets[0].key as number,
                      state.histogram.buckets[state.histogram.buckets.length - 1].key as number,
                    ])
                  : d => formatter.convert(d)
              }
            />

            <BarSeries
              data={state.histogram.buckets}
              id={specId}
              xAccessor={'key'}
              yAccessors={['count']}
              xScaleType={field.type === 'date' ? ScaleType.Time : ScaleType.Linear}
              yScaleType={ScaleType.Linear}
              customSeriesColors={seriesColors}
            />
          </Chart>
        )}

        {state.topValues && state.sampledValues && (!state.histogram || !showingHistogram) && (
          <div data-test-subj="lnsFieldListPanel-topValues">
            {state.topValues.buckets.map(topValue => (
              <div className="lnsFieldItem__topValue" key={topValue.key}>
                <EuiFlexGroup alignItems="stretch" key={topValue.key} gutterSize="xs">
                  <EuiFlexItem grow={true} className="eui-textTruncate">
                    <EuiToolTip content={formatter.convert(topValue.key)} delay="long">
                      <EuiText size="s" className="eui-textTruncate">
                        {formatter.convert(topValue.key)}
                      </EuiText>
                    </EuiToolTip>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText size="s" textAlign="left" color={euiTextColor}>
                      {((topValue.count / state.sampledValues!) * 100).toFixed(1)}%
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>

                <EuiProgress
                  className="lnsFieldItem__topValueProgress"
                  value={topValue.count / state.sampledValues!}
                  max={1}
                  size="s"
                  color={euiButtonColor}
                />
              </div>
            ))}
            {otherCount ? (
              <>
                <EuiFlexGroup alignItems="stretch" gutterSize="xs">
                  <EuiFlexItem grow={true} className="eui-textTruncate">
                    <EuiText size="s" className="eui-textTruncate" color="subdued">
                      {i18n.translate('xpack.lens.indexPattern.otherDocsLabel', {
                        defaultMessage: 'Other',
                      })}
                    </EuiText>
                  </EuiFlexItem>

                  <EuiFlexItem grow={false} className="eui-textTruncate">
                    <EuiText size="s" color="subdued">
                      {((otherCount / state.sampledValues!) * 100).toFixed(1)}%
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>

                <EuiProgress
                  className="lnsFieldItem__topValueProgress"
                  value={otherCount / state.sampledValues!}
                  max={1}
                  size="s"
                  color="subdued"
                />
              </>
            ) : (
              <></>
            )}
          </div>
        )}

        {state.totalDocuments ? (
          <EuiPopoverFooter>
            <EuiText size="xs" textAlign="center">
              {state.sampledDocuments && (
                <>
                  {i18n.translate('xpack.lens.indexPattern.percentageOfLabel', {
                    defaultMessage: '{percentage}% of',
                    values: {
                      percentage: ((state.sampledDocuments / state.totalDocuments) * 100).toFixed(
                        1
                      ),
                    },
                  })}
                </>
              )}{' '}
              <strong>{state.totalDocuments}</strong>{' '}
              {i18n.translate('xpack.lens.indexPattern.ofDocumentsLabel', {
                defaultMessage: 'documents',
              })}
            </EuiText>
          </EuiPopoverFooter>
        ) : (
          <></>
        )}
      </div>
    </EuiPopover>
  );
}
