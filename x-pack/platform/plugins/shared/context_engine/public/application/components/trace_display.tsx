/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useAgentBuilderAgents } from '../hooks/use_agent_builder_agents';
import { ItemRow } from './item_row';
import { ItemRowIcon } from './item_row_icon';
import type { EditableAiIndexTrace } from './trace_selector';

const ElasticAgentTraceDisplay = ({ value }: { value: string }) => {
  const { agents } = useAgentBuilderAgents();
  const typeLabel = i18n.translate('xpack.contextEngine.traceType.elasticAgent', {
    defaultMessage: 'Elastic agent',
  });
  const label = agents.find(({ id }) => id === value)?.name ?? value;

  return (
    <ItemRow
      label={label}
      icon={<ItemRowIcon iconType="productAgent" />}
      badge={
        <EuiBadge color="hollow" data-test-subj="contextSourceTypeBadge">
          {typeLabel}
        </EuiBadge>
      }
      data-test-subj="contextTracesReadOnlyValue"
    >
      <strong>{label}</strong>
    </ItemRow>
  );
};

const IndexTraceDisplay = ({ value }: { value: string }) => {
  const typeLabel = i18n.translate('xpack.contextEngine.traceType.dataStream', {
    defaultMessage: 'Data stream',
  });

  return (
    <ItemRow
      label={value}
      icon={<ItemRowIcon iconType="chartWaterfall" />}
      badge={
        <EuiBadge color="hollow" data-test-subj="contextSourceTypeBadge">
          {typeLabel}
        </EuiBadge>
      }
      data-test-subj="contextTracesReadOnlyValue"
    >
      <strong>{value}</strong>
    </ItemRow>
  );
};

export const TraceDisplay = ({ trace }: { trace: EditableAiIndexTrace }) => {
  if (trace.type === 'elastic_agent') {
    return <ElasticAgentTraceDisplay value={trace.value} />;
  }
  return <IndexTraceDisplay value={trace.value} />;
};
