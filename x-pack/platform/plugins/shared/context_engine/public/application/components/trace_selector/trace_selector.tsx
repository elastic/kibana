/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiButtonGroup, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';
import { DataStreamField } from './data_stream_field';
import { ElasticAgentField } from './elastic_agent_field';
import type { EditableAiIndexTrace, EditableTraceType } from './types';

interface TraceSelectorProps {
  value: EditableAiIndexTrace | undefined;
  onChange: (trace: EditableAiIndexTrace | undefined) => void;
}

export const TraceSelector = ({ value, onChange }: TraceSelectorProps) => {
  const [mode, setMode] = useState<EditableTraceType>(value?.type ?? 'elastic_agent');

  useEffect(() => {
    if (value !== undefined) {
      setMode(value.type);
    }
  }, [value]);

  const selectMode = (id: string) => {
    if (id !== 'elastic_agent' && id !== 'index') {
      return;
    }
    setMode(id);
    if (value?.type !== id) {
      onChange(undefined);
    }
  };

  return (
    <>
      <EuiButtonGroup
        legend={i18n.translate('xpack.contextEngine.traceSelector.toggleLegend', {
          defaultMessage: 'Agent trace source type',
        })}
        variant="selection"
        type="single"
        buttonSize="s"
        idSelected={mode}
        onChange={selectMode}
        data-test-subj="contextTraceToggle"
      >
        <EuiButton
          id="elastic_agent"
          iconType="productAgent"
          data-test-subj="contextTraceToggle-elastic_agent"
        >
          {i18n.translate('xpack.contextEngine.traceSelector.elasticAgentsToggle', {
            defaultMessage: 'Elastic agents',
          })}
        </EuiButton>
        <EuiButton id="index" iconType="listBullet" data-test-subj="contextTraceToggle-index">
          {i18n.translate('xpack.contextEngine.traceSelector.genAiLibrariesToggle', {
            defaultMessage: 'GenAI libraries',
          })}
        </EuiButton>
      </EuiButtonGroup>
      <EuiSpacer size="m" />
      {mode === 'elastic_agent' ? (
        <ElasticAgentField value={value} onChange={onChange} />
      ) : (
        <DataStreamField value={value} onChange={onChange} />
      )}
    </>
  );
};
