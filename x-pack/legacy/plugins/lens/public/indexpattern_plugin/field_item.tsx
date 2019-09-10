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
} from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import { toElasticsearchQuery } from '@kbn/es-query';
import { npStart } from 'ui/new_platform';
import { Query } from 'src/plugins/data/common';
// @ts-ignore
import { fieldFormats } from '../../../../../../src/legacy/ui/public/registry/field_formats';
import { IndexPattern, IndexPatternField, DraggedField } from './indexpattern';
import { DragDrop } from '../drag_drop';
import { FieldIcon, getColorForDataType } from './field_icon';
import { DatasourceDataPanelProps, DataType } from '../types';

export interface FieldItemProps {
  field: IndexPatternField;
  indexPattern: IndexPattern;
  highlight?: string;
  exists: boolean;
  query: Query;
  dateRange: DatasourceDataPanelProps['dateRange'];
}

export interface BucketedAggregation {
  buckets: Array<{
    key: number;
    doc_count: number;
  }>;
  sum_other_doc_count?: number;
  doc_count_error_upper_bound?: number;
}

export interface NumberStatsResult {
  histogram: {
    doc_count: number;
    histo: BucketedAggregation;
  };
  top_values: BucketedAggregation;
}

export interface TopValuesResult {
  doc_count: number;
  top_values: BucketedAggregation;
}

interface State {
  isLoading: boolean;
  doc_count?: number;
  histogram?: BucketedAggregation;
  topValues?: BucketedAggregation;
}

function wrapOnDot(str?: string) {
  // u200B is a non-width white-space character, which allows
  // the browser to efficiently word-wrap right after the dot
  // without us having to draw a lot of extra DOM elements, etc
  return str ? str.replace(/\./g, '.\u200B') : '';
}

export function FieldItem({
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
    formatter = new FormatType(
      indexPattern.fieldFormatMap[field.name].params,
      npStart.core.uiSettings.get.bind(npStart.core.uiSettings)
    );
  } else {
    formatter = fieldFormats.getDefaultInstance(field.type, field.esTypes);
  }

  function fetchData() {
    setState(s => ({ ...s, isLoading: true }));

    npStart.core.http
      .post(`/api/lens/index_stats/${indexPattern.title}/field`, {
        body: JSON.stringify({
          query: toElasticsearchQuery(query, indexPattern),
          earliest: dateRange.fromDate,
          latest: dateRange.toDate,
          timeFieldName: indexPattern.timeFieldName,
          field,
        }),
      })
      .then((results: NumberStatsResult | TopValuesResult) => {
        if (field.type === 'string') {
          setState(s => ({
            ...s,
            isLoading: false,
            doc_count: (results as TopValuesResult).doc_count,
            topValues: (results as TopValuesResult).top_values,
          }));
        } else if (field.type === 'number') {
          setState(s => ({
            ...s,
            isLoading: false,
            doc_count: (results as NumberStatsResult).histogram.doc_count,
            histogram: (results as NumberStatsResult).histogram.histo,
            topValues: (results as NumberStatsResult).top_values,
          }));
        } else if (field.type === 'date') {
          setState(s => ({
            ...s,
            isLoading: false,
            doc_count: (results as NumberStatsResult).histogram.doc_count,
            histogram: (results as NumberStatsResult).histogram.histo,
          }));
        } else {
          setState(s => ({
            ...s,
            isLoading: false,
          }));
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

  const totalValuesCount =
    state.topValues && state.topValues.buckets.reduce((prev, bucket) => bucket.doc_count + prev, 0);
  const otherCount = state.doc_count && totalValuesCount ? state.doc_count - totalValuesCount : 0;

  const euiButtonColor =
    field.type === 'string' ? 'accent' : field.type === 'number' ? 'secondary' : 'primary';
  const euiTextColor =
    field.type === 'string' ? 'accent' : field.type === 'number' ? 'secondary' : 'default';

  return (
    <EuiPopover
      id="lnsFieldListPanel__field"
      // Wait until @elastic/eui is at least version 13.7.0 to use display="block"
      display="block"
      // container={document.querySelector('.application')}
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
                if (exists) {
                  setOpen(!infoIsOpen);
                  fetchData();
                }
              }}
              onKeyPress={event => {
                if (exists && event.key === 'ENTER') {
                  setOpen(!infoIsOpen);
                  fetchData();
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

        {state.histogram && state.topValues && (
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
            <Settings rotation={90} />

            <Axis
              id={getAxisId('key')}
              position={Position.Left}
              tickFormat={d => formatter.convert(d)}
            />

            <BarSeries
              data={state.histogram.buckets}
              id={specId}
              xAccessor={'key'}
              yAccessors={['doc_count']}
              xScaleType={field.type === 'date' ? ScaleType.Time : ScaleType.Linear}
              yScaleType={ScaleType.Linear}
              customSeriesColors={seriesColors}
            />
          </Chart>
        )}

        {state.topValues &&
          (!state.histogram || !showingHistogram) &&
          (state.doc_count && (
            <div data-test-subj="lnsFieldListPanel-topValues">
              {state.topValues.buckets.map(topValue => (
                <React.Fragment key={topValue.key}>
                  <EuiFlexGroup alignItems="stretch" key={topValue.key}>
                    <EuiFlexItem grow={true} className="eui-textTruncate">
                      <EuiToolTip content={formatter.convert(topValue.key)}>
                        <EuiText size="s">{formatter.convert(topValue.key)}</EuiText>
                      </EuiToolTip>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false} className="eui-textTruncate">
                      <EuiText size="s" textAlign="left" color={euiTextColor}>
                        {((topValue.doc_count / state.doc_count!) * 100).toFixed(1)}%
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>

                  <div>
                    <EuiFlexItem grow={1}>
                      <EuiProgress
                        value={topValue.doc_count / state.doc_count!}
                        max={1}
                        size="s"
                        color={euiButtonColor}
                      />
                    </EuiFlexItem>
                  </div>

                  <EuiSpacer size="xs" />
                </React.Fragment>
              ))}
              {otherCount ? (
                <>
                  <EuiFlexGroup alignItems="stretch">
                    <EuiFlexItem grow={true} className="eui-textTruncate">
                      <EuiText size="s">
                        {i18n.translate('xpack.lens.indexPattern.otherDocsLabel', {
                          defaultMessage: 'Other',
                        })}
                      </EuiText>
                    </EuiFlexItem>

                    <EuiFlexItem grow={false} className="eui-textTruncate">
                      <EuiText size="s" color="subdued">
                        {((otherCount / state.doc_count) * 100).toFixed(1)}%
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>

                  <div>
                    <EuiProgress
                      value={otherCount / state.doc_count}
                      max={1}
                      size="s"
                      color="subdued"
                    />
                  </div>
                </>
              ) : (
                <></>
              )}
            </div>
          ))}

        {state.doc_count && (
          <div>
            <EuiSpacer size="m" />

            <EuiText size="s">
              {i18n.translate('xpack.lens.indexPattern.totalDocsLabel', {
                defaultMessage: '{docCount} documents',
                values: { docCount: state.doc_count },
              })}
            </EuiText>
          </div>
        )}
      </div>
    </EuiPopover>
  );
}
