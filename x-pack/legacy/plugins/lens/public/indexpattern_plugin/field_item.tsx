/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiProgress,
  EuiPopover,
  EuiLoadingSpinner,
  EuiKeyboardAccessible,
  EuiText,
  EuiToolTip,
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
import { DatasourceDataPanelProps } from '../types';
import { DataType } from '..';

export interface FieldItemProps {
  field: IndexPatternField;
  indexPattern: IndexPattern;
  highlight?: string;
  exists: boolean;
  howManyDocs?: number;
  count?: number;
  sampleCount?: number;
  cardinality?: number;
  query: Query;
  dateRange: DatasourceDataPanelProps['dateRange'];
}

export interface BucketedAggregation {
  buckets: Array<{
    key: number;
    doc_count: number;
  }>;
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

  useEffect(() => {
    // Re-fetches data when you close and reopen the popover
    if (!infoIsOpen || state.isLoading) {
      return;
    }

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
  }, [infoIsOpen, query, dateRange]);

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

  return (
    <DragDrop
      value={{ field, indexPatternId: indexPattern.id } as DraggedField}
      dataTestSubj="lnsFieldListPanelField"
      draggable
      className={`lnsFieldListPanel__field lnsFieldListPanel__field-btn-${
        field.type
      } lnsFieldListPanel__field--${exists ? 'exists' : 'missing'}`}
    >
      <EuiPopover
        id="lnsFieldListPanel__field"
        display="block"
        button={
          <EuiKeyboardAccessible>
            <div
              className="lnsFieldListPanel__fieldInfo"
              onClick={() => {
                if (exists) {
                  setOpen(!infoIsOpen);
                }
              }}
              onKeyPress={event => {
                if (exists && event.key === 'ENTER') {
                  setOpen(!infoIsOpen);
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
        }
        isOpen={infoIsOpen}
        closePopover={() => setOpen(false)}
        anchorPosition="rightUp"
      >
        <div>
          {state.isLoading && <EuiLoadingSpinner />}

          {state.histogram && (
            <Chart className="lnsDistributionChart">
              <Settings rotation={90} />

              <Axis
                id={getAxisId('key')}
                position={Position.Left}
                tickFormat={d => formatter.convert(d)}
              />
              <Axis id={getAxisId('doc_count')} position={Position.Bottom} />

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

          {state.topValues && (
            <div>
              {state.doc_count && (
                <div>
                  <div>
                    {state.topValues.buckets.map(topValue => (
                      <EuiFlexGroup gutterSize="xs" alignItems="center" key={topValue.key}>
                        <EuiFlexItem
                          grow={false}
                          style={{ width: 100 }}
                          className="eui-textTruncate"
                        >
                          <EuiToolTip content={formatter.convert(topValue.key)}>
                            <EuiText size="s" textAlign="right">
                              {formatter.convert(topValue.key)}
                            </EuiText>
                          </EuiToolTip>
                        </EuiFlexItem>
                        <EuiFlexItem grow={1}>
                          <EuiProgress
                            value={topValue.doc_count / state.doc_count!}
                            max={1}
                            size="l"
                            color={
                              field.type === 'string'
                                ? 'accent'
                                : field.type === 'number'
                                ? 'secondary'
                                : 'primary'
                            }
                          />
                        </EuiFlexItem>
                        <EuiFlexItem
                          grow={false}
                          style={{ width: 70 }}
                          className="eui-textTruncate"
                        >
                          <EuiText size="s" textAlign="left">
                            {((topValue.doc_count / state.doc_count!) * 100).toFixed(1)}%
                          </EuiText>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {state.doc_count && (
            <EuiText size="s">
              {i18n.translate('xpack.lens.indexPattern.fieldSampleCountLabel', {
                defaultMessage: 'Sampled from {sampleCount} documents',
                values: { sampleCount: state.doc_count },
              })}
            </EuiText>
          )}
        </div>
      </EuiPopover>
    </DragDrop>
  );
}
