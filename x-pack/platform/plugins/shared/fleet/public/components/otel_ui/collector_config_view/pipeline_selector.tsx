/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';

import { EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { ALL_PIPELINES, SIGNAL_PREFIX, getSignalType } from './utils';

interface PipelineSelectorProps {
  pipelineIds: string[];
  selectedPipelineId: string;
  onChange: (pipelineId: string) => void;
}

export const PipelineSelector: React.FunctionComponent<PipelineSelectorProps> = ({
  pipelineIds,
  selectedPipelineId,
  onChange,
}) => {
  const options = useMemo(() => {
    const allOption = {
      value: ALL_PIPELINES,
      text: i18n.translate('xpack.fleet.otelUi.collectorConfigView.allPipelines', {
        defaultMessage: 'All pipelines',
      }),
    };

    const signalGroups = pipelineIds.reduce((acc, id) => {
      const signal = getSignalType(id);
      const group = acc.get(signal) ?? [];
      group.push(id);
      acc.set(signal, group);
      return acc;
    }, new Map<string, string[]>());

    const signalOptions = Array.from(signalGroups.entries())
      .filter(([, ids]) => ids.length > 1)
      .map(([signal, ids]) => ({
        value: `${SIGNAL_PREFIX}${signal}`,
        text: i18n.translate('xpack.fleet.otelUi.collectorConfigView.allSignalPipelines', {
          defaultMessage: 'All {signal} ({count} pipelines)',
          values: { signal, count: ids.length },
        }),
      }));

    const pipelineOptions = pipelineIds.map((id) => ({ value: id, text: id }));

    return [allOption, ...signalOptions, ...pipelineOptions];
  }, [pipelineIds]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  return (
    <EuiSelect
      prepend={i18n.translate('xpack.fleet.otelUi.collectorConfigView.pipelineLabel', {
        defaultMessage: 'Pipeline',
      })}
      aria-label={i18n.translate('xpack.fleet.otelUi.collectorConfigView.pipelineLabel', {
        defaultMessage: 'Pipeline',
      })}
      options={options}
      value={selectedPipelineId}
      onChange={handleChange}
      data-test-subj="otelPipelineSelector"
    />
  );
};
