/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAvatar, EuiBadge, type IconType } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useAgentBuilderAgents } from '../hooks/use_agent_builder_agents';
import { ItemRow } from './item_row';
import type { EditableAiIndexTrace } from './trace_selector';

const TraceIcon = ({ iconType, typeLabel }: { iconType: IconType; typeLabel: string }) => (
  <EuiAvatar
    type="space"
    size="m"
    color="subdued"
    name={typeLabel}
    iconType={iconType}
    iconColor="primary"
    iconSize="m"
  />
);

const ElasticAgentTraceDisplay = ({ value }: { value: string }) => {
  const { agents } = useAgentBuilderAgents();
  const typeLabel = i18n.translate('xpack.contextEngine.traceType.elasticAgent', {
    defaultMessage: 'Elastic agent',
  });
  const label = agents.find(({ id }) => id === value)?.name ?? value;

  return (
    <ItemRow
      label={label}
      icon={<TraceIcon iconType="productAgent" typeLabel={typeLabel} />}
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
      icon={<TraceIcon iconType="listBullet" typeLabel={typeLabel} />}
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
