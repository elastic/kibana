/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, useState, useCallback, useMemo, useEffect } from 'react';
import {
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { type SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { debounce } from 'lodash';
import usePrevious from 'react-use/lib/usePrevious';
import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';
import { useCancellableSearch } from '../../hooks/use_cancellable_search';
import { useDataSource } from '../../hooks/use_data_source';

export interface PartitionsSelectorProps {
  splitField: string;
  value: string[];
  onChange: (update: string[]) => void;
  enableSearch?: boolean;
}

function getQueryPayload(
  indexPattern: string,
  fieldName: string,
  queryString: string = '',
  selectedPartitions?: string[]
) {
  return {
    params: {
      index: indexPattern,
      size: 0,
      ...(selectedPartitions?.length
        ? {
            query: {
              bool: {
                must_not: [
                  {
                    terms: {
                      [fieldName]: selectedPartitions,
                    },
                  },
                ],
              },
            },
          }
        : {}),
      aggs: {
        aggResults: {
          filter: {
            bool: {
              must: {
                wildcard: {
                  [fieldName]: {
                    value: `*${queryString}*`,
                  },
                },
              },
            },
          },
          aggs: {
            partitionValues: {
              terms: {
                field: fieldName,
              },
            },
          },
        },
      },
    } as SearchRequest,
  };
}

interface PartitionsResponse {
  aggregations: {
    aggResults: {
      partitionValues: { buckets: Array<{ key: string }> };
    };
  };
}

export const PartitionsSelector: FC<PartitionsSelectorProps> = ({
  value,
  onChange,
  splitField,
  enableSearch = true,
}) => {
  const { dataView } = useDataSource();
  const {
    notifications: { toasts },
  } = useAiopsAppContext();
  const prevSplitField = usePrevious(splitField);
  const [options, setOptions] = useState<Array<EuiComboBoxOptionOption<string>>>([]);
  const [isLoading, setIsLoading] = useState(enableSearch);
  const { runRequest, cancelRequest } = useCancellableSearch();

  const fetchResults = useCallback(
    async (searchValue: string) => {
      if (!enableSearch) return;

      cancelRequest();
      setIsLoading(true);
      try {
        const requestPayload = getQueryPayload(
          dataView.getIndexPattern(),
          splitField,
          searchValue,
          value
        );

        const result = await runRequest<typeof requestPayload, { rawResponse: PartitionsResponse }>(
          requestPayload
        );

        if (result === null) {
          setOptions([]);
          return;
        }

        setOptions(
          result.rawResponse.aggregations.aggResults.partitionValues.buckets.map((v) => ({
            value: v.key,
            label: v.key,
          }))
        );
      } catch (e) {
        toasts.addError(e, {
          title: i18n.translate('xpack.aiops.changePointDetection.fetchPartitionsErrorTitle', {
            defaultMessage: 'Failed to fetch partitions',
          }),
        });
      }
      setIsLoading(false);
    },
    [enableSearch, cancelRequest, dataView, splitField, value, runRequest, toasts]
  );

  useEffect(
    function onSplitFieldChange() {
      fetchResults('');
      if (prevSplitField !== undefined && splitField !== prevSplitField) {
        onChange([]);
      }
    },
    [splitField, prevSplitField, fetchResults, onChange]
  );

  const selectedOptions = useMemo<Array<EuiComboBoxOptionOption<string>>>(() => {
    return value.map((v) => ({ value: v, label: v }));
  }, [value]);

  const onChangeCallback = useCallback(
    (udpate: EuiComboBoxOptionOption[]) => {
      onChange(udpate.map((v) => v.value as string));
    },
    [onChange]
  );

  const onSearchChange = useMemo(() => debounce(fetchResults, 500), [fetchResults]);

  const onCreateOption = useCallback(
    (v: string) => {
      onChange([...value, v]);
    },
    [onChange, value]
  );

  return (
    <EuiFormRow
      fullWidth
      label={
        <EuiFlexGroup gutterSize="xs" alignItems="center">
          <EuiFlexItem grow={false}>
            {i18n.translate('xpack.aiops.changePointDetection.partitionsLabel', {
              defaultMessage: 'Partitions',
            })}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip
              content={i18n.translate('xpack.aiops.changePointDetection.partitionsDescription', {
                defaultMessage:
                  'If not supplied, the largest change points across all split field values will be displayed.',
              })}
              position="right"
            >
              <EuiIcon size="s" type="questionInCircle" />
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
    >
      <EuiComboBox<string>
        isLoading={isLoading}
        fullWidth
        compressed
        options={options}
        selectedOptions={selectedOptions}
        onChange={onChangeCallback}
        onSearchChange={enableSearch ? onSearchChange : undefined}
        onCreateOption={!enableSearch ? onCreateOption : undefined}
        isClearable
        data-test-subj="aiopsChangePointPartitions"
      />
    </EuiFormRow>
  );
};
