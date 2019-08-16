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
  EuiButtonIcon,
} from '@elastic/eui';
import {
  Chart,
  Axis,
  getAxisId,
  getSpecId,
  AreaSeries,
  BarSeries,
  Position,
  ScaleType,
  Settings,
} from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import { toElasticsearchQuery } from '@kbn/es-query';
import { npStart } from 'ui/new_platform';
import { Query } from 'src/plugins/data/common';
// @ts-ignore
import { fieldFormats } from '../../../../../../src/legacy/ui/public/registry/field_formats';
import { IndexPattern, IndexPatternField, DraggedField } from './indexpattern';
import { DragDrop } from '../drag_drop';
import { FieldIcon } from './field_icon';
import { DatasourceDataPanelProps } from '../types';
import { DataType } from '..';

export interface FieldItemProps {
  field: IndexPatternField;
  indexPattern: IndexPattern;
  highlight?: string;
  metaData?: DataVisResults;
  exists: boolean;
  howManyDocs?: number;
  count?: number;
  sampleCount?: number;
  cardinality?: number;
  query: Query;
  dateRange: DatasourceDataPanelProps['dateRange'];
}

export interface DataVisResults {
  fieldName: string;
  count?: number;
  examples?: number | string;
  earliest?: number;
  latest?: number;
  min?: number;
  max?: number;
  avg?: number;
  isTopValuesSampled?: boolean;
  topValues?: Array<{ key: number; doc_count: number }>;
  topValuesSampleSize?: number;
  topValuesSamplerShardSize?: number;
  median?: number;
  distribution?: {
    minPercentile: number;
    maxPercentile: number;
    percentiles: Array<{ percent: number; minValue: number; maxValue: number }>;
  };
}

export interface HistogramResult {
  buckets: Array<{
    key: number;
    doc_count: number;
  }>;
}

interface State {
  fieldMetadata?: DataVisResults;
  fieldHistogram?: HistogramResult;
  isLoading: boolean;
}

function wrapOnDot(str?: string) {
  // u200B is a non-width white-space character, which allows
  // the browser to efficiently word-wrap right after the dot
  // without us having to draw a lot of extra DOM elements, etc
  return str ? str.replace(/\./g, '.\u200B') : '';
}

function distributionToChart({ min, distribution }: DataVisResults) {
  let currentPercentile = 0;
  return [{ x: min!, y: distribution!.minPercentile }].concat(
    distribution!.percentiles.map(percentile => {
      currentPercentile = currentPercentile + percentile.percent;
      return { x: percentile.minValue, y: currentPercentile };
    })
  );
}

export function FieldItem({
  field,
  indexPattern,
  highlight,
  exists,
  howManyDocs,
  count,
  sampleCount,
  cardinality,
  query,
  dateRange,
}: FieldItemProps) {
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

    if (field.type !== 'number') {
      npStart.core.http
        .post(`/api/ml/data_visualizer/get_field_stats/${indexPattern.title}`, {
          body: JSON.stringify({
            query: toElasticsearchQuery(query, indexPattern),
            fields: [
              {
                fieldName: field.name,
                type: field.type === 'string' && field.esTypes ? field.esTypes[0] : field.type,
                cardinality,
              },
            ],
            samplerShardSize: 5000,
            timeFieldName: indexPattern.timeFieldName,
            earliest: dateRange.fromDate,
            latest: dateRange.toDate,
            interval: '1d',
            maxExamples: 5,
          }),
        })
        .then((results: [DataVisResults]) => {
          setState(s => ({ ...s, isLoading: false, fieldMetadata: results[0] }));
        })
        .catch(() => {
          setState(s => ({ ...s, isLoading: false }));
        });
    } else {
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
        .then((results: HistogramResult) => {
          setState(s => ({ ...s, isLoading: false, fieldHistogram: results }));
        })
        .catch(() => {
          setState(s => ({ ...s, isLoading: false }));
        });
    }
  }, [infoIsOpen, query, dateRange]);

  return (
    <DragDrop
      value={{ field, indexPatternId: indexPattern.id } as DraggedField}
      draggable
      className={`lnsFieldListPanel__field lnsFieldListPanel__field-btn-${
        field.type
      } lnsFieldListPanel__field-${exists ? 'exists' : 'missing'}`}
    >
      <div className="lnsFieldListPanel__fieldInfo">
        <FieldIcon type={field.type as DataType} />

        <span className="lnsFieldListPanel__fieldName" title={field.name}>
          {wrappableHighlightableFieldName}
        </span>

        {exists && (
          <EuiPopover
            id="lnsFieldListPanel__field"
            button={<EuiButtonIcon iconType="magnifyWithPlus" onClick={() => setOpen(true)} />}
            isOpen={infoIsOpen}
            closePopover={() => setOpen(false)}
            anchorPosition="rightUp"
          >
            <div>
              {state.isLoading && <EuiLoadingSpinner />}

              {state.fieldHistogram && (
                <Chart className="lnsDistributionChart">
                  <Settings rotation={90} />

                  <Axis
                    id={getAxisId('key')}
                    position={Position.Left}
                    tickFormat={d => formatter.convert(d)}
                  />
                  <Axis id={getAxisId('doc_count')} position={Position.Bottom} />

                  <BarSeries
                    data={state.fieldHistogram.buckets}
                    xAccessor={'key'}
                    yAccessors={['doc_count']}
                    id={getSpecId('distribution')}
                    xScaleType={ScaleType.Linear}
                    yScaleType={ScaleType.Linear}
                  />
                </Chart>
              )}

              {state.fieldMetadata && cardinality && sampleCount && (
                <div>
                  {state.fieldMetadata && (
                    <div>
                      {i18n.translate('xpack.lens.indexPattern.fieldSampleCountLabel', {
                        defaultMessage: 'Sampled from {sampleCount} documents per shard',
                        values: { sampleCount: state.fieldMetadata.topValuesSampleSize },
                      })}
                    </div>
                  )}

                  {state.fieldMetadata.distribution && cardinality / sampleCount > 0.02 ? (
                    <Chart className="lnsDistributionChart">
                      <Axis
                        id={getAxisId('x')}
                        position={Position.Bottom}
                        title={'Values'}
                        tickFormat={d => formatter.convert(d)}
                      />

                      <Axis
                        id={getAxisId('y')}
                        position={Position.Left}
                        tickFormat={d => `${d}%`}
                      />

                      <AreaSeries
                        data={distributionToChart(state.fieldMetadata)}
                        xAccessor={'x'}
                        yAccessors={['y']}
                        id={getSpecId('distribution')}
                        xScaleType={ScaleType.Linear}
                        yScaleType={ScaleType.Linear}
                      />
                    </Chart>
                  ) : (
                    state.fieldMetadata.topValues &&
                    count && (
                      <div>
                        {state.fieldMetadata.topValues.map(topValue => (
                          <EuiFlexGroup>
                            <EuiFlexItem>{formatter.convert(topValue.key)}</EuiFlexItem>
                            <EuiFlexItem grow={1}>
                              <EuiProgress value={topValue.doc_count / count} max={1} size={'m'} />
                            </EuiFlexItem>
                            <EuiFlexItem>
                              {((topValue.doc_count / count) * 100).toFixed(1)}%
                            </EuiFlexItem>
                          </EuiFlexGroup>
                        ))}
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </EuiPopover>
        )}
      </div>
    </DragDrop>
  );
}
