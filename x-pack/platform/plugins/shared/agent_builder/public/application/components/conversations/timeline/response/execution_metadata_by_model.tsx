/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  EuiTextColor,
  EuiToolTip,
  RIGHT_ALIGNMENT,
  euiPaletteColorBlind,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import { useLoadConnectors } from '@kbn/inference-connectors';
import type { RoundModelUsageStats } from '@kbn/agent-builder-common';
import { useKibana } from '../../../../hooks/use_kibana';
import { getModelColor } from './model_colors';

const labels = {
  tableCaption: i18n.translate('xpack.agentBuilder.response.metadataPopover.byModel.tableCaption', {
    defaultMessage: 'Token usage by model',
  }),
  model: i18n.translate('xpack.agentBuilder.response.metadataPopover.byModel.model', {
    defaultMessage: 'Model',
  }),
  llmCalls: i18n.translate('xpack.agentBuilder.response.metadataPopover.byModel.llmCalls', {
    defaultMessage: 'LLM calls',
  }),
  tokensSent: i18n.translate('xpack.agentBuilder.response.metadataPopover.byModel.tokensSent', {
    defaultMessage: 'Tokens sent',
  }),
  tokensSentWithCache: i18n.translate(
    'xpack.agentBuilder.response.metadataPopover.byModel.tokensSentWithCache',
    { defaultMessage: 'Tokens sent (cached)' }
  ),
  tokensReceived: i18n.translate(
    'xpack.agentBuilder.response.metadataPopover.byModel.tokensReceived',
    { defaultMessage: 'Tokens received' }
  ),
  tokensReceivedWithReasoning: i18n.translate(
    'xpack.agentBuilder.response.metadataPopover.byModel.tokensReceivedWithReasoning',
    { defaultMessage: 'Tokens received (reasoning)' }
  ),
  allModels: i18n.translate('xpack.agentBuilder.response.metadataPopover.byModel.allModels', {
    defaultMessage: 'All models',
  }),
  notReported: i18n.translate('xpack.agentBuilder.response.metadataPopover.byModel.notReported', {
    defaultMessage: 'Not reported by this model',
  }),
};

interface ModelRow {
  key: string;
  label: string;
  fullName?: string;
  color?: string;
  llmCalls: number;
  inputTokens: number;
  cachedInputTokens?: number;
  outputTokens: number;
  reasoningTokens?: number;
}

const MODEL_PALETTE = euiPaletteColorBlind().filter((_, index) => index % 2 === 0);

const formatCompactNumber = (value: number): string => numeral(value).format('0.[0]a');

const removeCreatorPrefix = (name: string, creator?: string): string => {
  if (!creator) {
    return name;
  }
  const prefix = `${creator} `;
  return name.toLowerCase().startsWith(prefix.toLowerCase()) && name.length > prefix.length
    ? name.slice(prefix.length)
    : name;
};

const NOT_REPORTED = '—';

const ReportedTokens: React.FC<{ value?: number }> = ({ value }) =>
  value === undefined ? (
    <EuiToolTip content={labels.notReported}>
      <span tabIndex={0} aria-label={labels.notReported}>
        {NOT_REPORTED}
      </span>
    </EuiToolTip>
  ) : (
    <>{formatCompactNumber(value)}</>
  );

const useCellPaddingStyles = () => {
  const { euiTheme } = useEuiTheme();
  return css({ paddingBlock: euiTheme.size.s });
};

const Cell: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const paddingStyles = useCellPaddingStyles();
  return (
    <EuiText size="s" css={paddingStyles}>
      {children}
    </EuiText>
  );
};

const wrappingHeaderStyles = css({ whiteSpace: 'normal' });
const rightAlignedHeaderStyles = css({ whiteSpace: 'normal', textAlign: 'right' });

const HeaderCell: React.FC<React.PropsWithChildren<{ isRightAligned?: boolean }>> = ({
  children,
  isRightAligned = false,
}) => (
  <EuiText size="s" css={isRightAligned ? rightAlignedHeaderStyles : wrappingHeaderStyles}>
    <strong>{children}</strong>
  </EuiText>
);

const truncatedTextStyles = css({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

const ModelName: React.FC<{ label: string; tooltip: string; color: string }> = ({
  label,
  tooltip,
  color,
}) => {
  const paddingStyles = useCellPaddingStyles();
  return (
    <EuiToolTip content={tooltip} display="block">
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} css={paddingStyles}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="dot" color={color} aria-hidden="true" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s" css={truncatedTextStyles}>
            {label}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiToolTip>
  );
};

const getColumns = (
  hasCache: boolean,
  hasReasoning: boolean
): Array<EuiBasicTableColumn<ModelRow>> => [
  {
    field: 'label',
    name: <HeaderCell>{labels.model}</HeaderCell>,
    width: '36%',
    render: (label: string, { color, fullName }: ModelRow) =>
      color ? (
        <ModelName label={label} tooltip={fullName ?? label} color={color} />
      ) : (
        <Cell>{label}</Cell>
      ),
  },
  {
    field: 'llmCalls',
    name: <HeaderCell isRightAligned>{labels.llmCalls}</HeaderCell>,
    width: '13%',
    align: RIGHT_ALIGNMENT,
    render: (llmCalls: number) => (
      <Cell>
        <strong>{formatCompactNumber(llmCalls)}</strong>
      </Cell>
    ),
  },
  {
    field: 'inputTokens',
    name: (
      <HeaderCell isRightAligned>
        {hasCache ? labels.tokensSentWithCache : labels.tokensSent}
      </HeaderCell>
    ),
    width: '30%',
    align: RIGHT_ALIGNMENT,
    render: (inputTokens: number, { cachedInputTokens }: ModelRow) => (
      <Cell>
        <strong>{formatCompactNumber(inputTokens)}</strong>
        {hasCache && (
          <>
            {' '}
            <EuiTextColor color="subdued">
              (<ReportedTokens value={cachedInputTokens} />)
            </EuiTextColor>
          </>
        )}
      </Cell>
    ),
  },
  {
    field: 'outputTokens',
    name: (
      <HeaderCell isRightAligned>
        {hasReasoning ? labels.tokensReceivedWithReasoning : labels.tokensReceived}
      </HeaderCell>
    ),
    width: '21%',
    align: RIGHT_ALIGNMENT,
    render: (outputTokens: number, { reasoningTokens }: ModelRow) => (
      <Cell>
        <strong>{formatCompactNumber(outputTokens)}</strong>
        {hasReasoning && (
          <>
            {' '}
            <EuiTextColor color="subdued">
              (<ReportedTokens value={reasoningTokens} />)
            </EuiTextColor>
          </>
        )}
      </Cell>
    ),
  },
];

interface ExecutionMetadataByModelProps {
  modelUsage: RoundModelUsageStats;
}

export const ExecutionMetadataByModel: React.FC<ExecutionMetadataByModelProps> = ({
  modelUsage,
}) => {
  const {
    services: { http },
  } = useKibana();
  const { data: aiConnectors } = useLoadConnectors({ http, featureId: 'agent_builder' });

  const hasCache = modelUsage.cached_input_tokens !== undefined;
  const hasReasoning = modelUsage.reasoning_tokens !== undefined;
  const columns = useMemo(() => getColumns(hasCache, hasReasoning), [hasCache, hasReasoning]);

  const rows = useMemo<ModelRow[]>(() => {
    const connectors = modelUsage.connectors ?? [];
    const aiConnectorsById = new Map(
      (aiConnectors ?? []).map((aiConnector) => [aiConnector.id, aiConnector])
    );
    const getKey = ({
      connector_id: connectorId,
      model,
    }: {
      connector_id: string;
      model?: string;
    }) => model ?? connectorId;

    return [
      {
        key: 'all',
        label: labels.allModels,
        llmCalls: modelUsage.llm_calls,
        inputTokens: modelUsage.input_tokens,
        cachedInputTokens: modelUsage.cached_input_tokens,
        outputTokens: modelUsage.output_tokens,
        reasoningTokens: modelUsage.reasoning_tokens,
      },
      ...connectors.map((connector) => {
        const aiConnector = aiConnectorsById.get(connector.connector_id);
        return {
          key: connector.connector_id,
          label: aiConnector
            ? removeCreatorPrefix(aiConnector.name, aiConnector.metadata?.display?.model_creator)
            : getKey(connector),
          fullName: aiConnector?.name,
          color: getModelColor(getKey(connector), MODEL_PALETTE),
          llmCalls: connector.llm_calls,
          inputTokens: connector.input_tokens,
          cachedInputTokens: connector.cached_input_tokens,
          outputTokens: connector.output_tokens,
          reasoningTokens: connector.reasoning_tokens,
        };
      }),
    ];
  }, [modelUsage, aiConnectors]);

  return (
    <EuiBasicTable
      tableCaption={labels.tableCaption}
      items={rows}
      columns={columns}
      tableLayout="fixed"
      compressed
      rowProps={({ key }) => ({ 'data-test-subj': `executionMetadataModelRow-${key}` })}
      data-test-subj="executionMetadataByModelTable"
    />
  );
};
