/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonGroup, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';
import type { AiIndexTrace } from '../../../../common/http_api/ai_indices';
import { DataStreamField } from './data_stream_field';
import { ElasticAgentField } from './elastic_agent_field';

type TraceMode = 'elastic_agent' | 'index';

interface TraceSelectorProps {
  value: AiIndexTrace | undefined;
  onChange: (trace: AiIndexTrace | undefined) => void;
}

const getTraceMode = (trace: AiIndexTrace | undefined): TraceMode =>
  trace?.type === 'index' ? 'index' : 'elastic_agent';

export const TraceSelector = ({ value, onChange }: TraceSelectorProps) => {
  const [mode, setMode] = useState<TraceMode>(() => getTraceMode(value));

  useEffect(() => {
    setMode(getTraceMode(value));
  }, [value]);

  const handleModeChange = (id: string) => {
    if (id === 'elastic_agent' || id === 'index') {
      setMode(id);
      onChange(undefined);
    }
  };

  return (
    <>
      <EuiButtonGroup
        legend={i18n.translate('xpack.contextEngine.traceSelector.toggleLegend', {
          defaultMessage: 'Agent trace source type',
        })}
        type="single"
        buttonSize="compressed"
        idSelected={mode}
        onChange={handleModeChange}
        options={[
          {
            id: 'elastic_agent',
            label: i18n.translate('xpack.contextEngine.traceSelector.elasticAgentsToggle', {
              defaultMessage: 'Elastic Agents',
            }),
            iconType: 'crosshairs',
            'data-test-subj': 'contextTraceToggle-elastic_agent',
          },
          {
            id: 'index',
            label: i18n.translate('xpack.contextEngine.traceSelector.genAiLibrariesToggle', {
              defaultMessage: 'GenAI Libraries',
            }),
            iconType: 'list',
            'data-test-subj': 'contextTraceToggle-index',
          },
        ]}
        data-test-subj="contextTraceToggle"
      />
      <EuiSpacer size="m" />
      {mode === 'elastic_agent' ? (
        <ElasticAgentField value={value} onChange={onChange} />
      ) : (
        <DataStreamField value={value} onChange={onChange} />
      )}
    </>
  );
};
