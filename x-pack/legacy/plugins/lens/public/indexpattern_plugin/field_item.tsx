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
import { i18n } from '@kbn/i18n';
import { kfetch } from 'ui/kfetch';
import { IndexPattern, IndexPatternField, DraggedField } from './indexpattern';
import { DragDrop } from '../drag_drop';
import { FieldIcon } from './field_icon';
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

interface State {
  fieldMetadata?: DataVisResults;
  isLoading: boolean;
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
  howManyDocs,
  count,
  sampleCount,
  cardinality,
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

  useEffect(() => {
    if (infoIsOpen && !state.fieldMetadata && !state.isLoading) {
      setState({ ...state, isLoading: true });

      kfetch({
        method: 'POST',
        pathname: `/api/ml/data_visualizer/get_field_stats/${indexPattern.title}`,
        body: JSON.stringify({
          query: { match_all: {} },
          fields: [
            {
              fieldName: field.name,
              type: field.type === 'string' && field.esTypes ? field.esTypes[0] : field.type,
              cardinality,
            },
          ],
          samplerShardSize: 5000,
          timeFieldName: indexPattern.timeFieldName,
          earliest: 'now-14d',
          latest: 'now',
          interval: '1d',
          maxExamples: 5,
        }),
      })
        .then((results: [DataVisResults]) => {
          setState(s => ({ ...s, isLoading: false, fieldMetadata: results[0] }));
        })
        .catch(() => {
          setState(s => ({ ...state, isLoading: false }));
        });
    }
  }, [infoIsOpen]);

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
              {count && (
                <div>
                  {i18n.translate('xpack.lens.indexPattern.fieldCountLabel', {
                    defaultMessage: 'Count: {count} ({percent}%)',
                    values: {
                      count,
                      percent: (howManyDocs ? (count / howManyDocs) * 100 : 100).toFixed(1),
                    },
                  })}
                </div>
              )}

              {cardinality && (
                <div>
                  {i18n.translate('xpack.lens.indexPattern.fieldCardinalityLabel', {
                    defaultMessage: '{cardinality} distinct values',
                    values: { cardinality },
                  })}
                </div>
              )}

              {sampleCount && (
                <div>
                  {i18n.translate('xpack.lens.indexPattern.fieldSampleCountLabel', {
                    defaultMessage: 'Sampled from {sampleCount} documents per shard',
                    values: { sampleCount },
                  })}
                </div>
              )}

              {state.isLoading && <EuiLoadingSpinner />}

              {state.fieldMetadata && (
                <div>
                  {state.fieldMetadata.topValues && count && (
                    <div>
                      {state.fieldMetadata.topValues.map(topValue => (
                        <EuiFlexGroup>
                          <EuiFlexItem>{topValue.key}</EuiFlexItem>
                          <EuiFlexItem grow={1}>
                            <EuiProgress value={topValue.doc_count / count} max={1} size={'m'} />
                          </EuiFlexItem>
                          <EuiFlexItem>
                            {((topValue.doc_count / count) * 100).toFixed(1)}%
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      ))}
                    </div>
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
