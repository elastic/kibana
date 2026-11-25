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
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useLoadConnectors } from '@kbn/inference-connectors';
import type { RoundModelUsageStats } from '@kbn/agent-builder-common';
import { useKibana } from '../../../../hooks/use_kibana';
import { formatCompactNumber } from '../../../../utils/format_compact_number';
import { getModelColors } from './model_colors';

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
  tokensReceived: i18n.translate(
    'xpack.agentBuilder.response.metadataPopover.byModel.tokensReceived',
    { defaultMessage: 'Tokens received' }
  ),
  cachedSuffix: i18n.translate('xpack.agentBuilder.response.metadataPopover.byModel.cachedSuffix', {
    defaultMessage: '(cached)',
  }),
  reasoningSuffix: i18n.translate(
    'xpack.agentBuilder.response.metadataPopover.byModel.reasoningSuffix',
    { defaultMessage: '(reasoning)' }
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

const noWrapStyles = css({ whiteSpace: 'nowrap' });
const rightAlignedNoWrapStyles = css({ whiteSpace: 'nowrap', textAlign: 'right' });

const TextCell: React.FC<React.PropsWithChildren<{}>> = ({ children }) => (
  <EuiText size="xs" css={noWrapStyles}>
    {children}
  </EuiText>
);

interface HeaderCellProps {
  isRightAligned?: boolean;
  subLabel?: string;
  hasSecondLine?: boolean;
}

const HeaderCell: React.FC<React.PropsWithChildren<HeaderCellProps>> = ({
  children,
  isRightAligned = false,
  subLabel,
  hasSecondLine = false,
}) => (
  <EuiText size="xs" css={isRightAligned ? rightAlignedNoWrapStyles : noWrapStyles}>
    <strong>{children}</strong>
    {hasSecondLine && (
      <div aria-hidden={!subLabel}>{subLabel ? <strong>{subLabel}</strong> : <>&nbsp;</>}</div>
    )}
  </EuiText>
);

const truncatedTextStyles = css({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

const nameContainerStyles = css({ flexGrow: 1, width: 0, minWidth: 0 });
const shrinkableStyles = css({ minWidth: 0 });

const ModelName: React.FC<{ label: string; tooltip: string; color: string }> = ({
  label,
  tooltip,
  color,
}) => (
  <div css={nameContainerStyles}>
    <EuiToolTip content={tooltip} display="block">
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="dot" color={color} aria-hidden="true" />
        </EuiFlexItem>
        <EuiFlexItem css={shrinkableStyles}>
          <EuiText size="xs" css={truncatedTextStyles}>
            {label}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiToolTip>
  </div>
);

const getColumns = (
  hasCache: boolean,
  hasReasoning: boolean,
  hasSecondHeaderLine: boolean
): Array<EuiBasicTableColumn<ModelRow>> => [
  {
    field: 'label',
    name: <HeaderCell hasSecondLine={hasSecondHeaderLine}>{labels.model}</HeaderCell>,
    width: '100%',
    render: (label: string, { color, fullName }: ModelRow) =>
      color ? (
        <ModelName label={label} tooltip={fullName ?? label} color={color} />
      ) : (
        <TextCell>{label}</TextCell>
      ),
  },
  {
    field: 'llmCalls',
    name: (
      <HeaderCell isRightAligned hasSecondLine={hasSecondHeaderLine}>
        {labels.llmCalls}
      </HeaderCell>
    ),
    align: RIGHT_ALIGNMENT,
    render: (llmCalls: number) => (
      <TextCell>
        <strong>{formatCompactNumber(llmCalls)}</strong>
      </TextCell>
    ),
  },
  {
    field: 'inputTokens',
    name: (
      <HeaderCell
        isRightAligned
        subLabel={hasCache ? labels.cachedSuffix : undefined}
        hasSecondLine={hasSecondHeaderLine}
      >
        {labels.tokensSent}
      </HeaderCell>
    ),
    align: RIGHT_ALIGNMENT,
    render: (inputTokens: number, { cachedInputTokens }: ModelRow) => (
      <TextCell>
        <strong>{formatCompactNumber(inputTokens)}</strong>
        {hasCache && (
          <>
            {' '}
            <EuiTextColor color="subdued">
              (<ReportedTokens value={cachedInputTokens} />)
            </EuiTextColor>
          </>
        )}
      </TextCell>
    ),
  },
  {
    field: 'outputTokens',
    name: (
      <HeaderCell
        isRightAligned
        subLabel={hasReasoning ? labels.reasoningSuffix : undefined}
        hasSecondLine={hasSecondHeaderLine}
      >
        {labels.tokensReceived}
      </HeaderCell>
    ),
    align: RIGHT_ALIGNMENT,
    render: (outputTokens: number, { reasoningTokens }: ModelRow) => (
      <TextCell>
        <strong>{formatCompactNumber(outputTokens)}</strong>
        {hasReasoning && (
          <>
            {' '}
            <EuiTextColor color="subdued">
              (<ReportedTokens value={reasoningTokens} />)
            </EuiTextColor>
          </>
        )}
      </TextCell>
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
  const columns = useMemo(
    () => getColumns(hasCache, hasReasoning, hasCache || hasReasoning),
    [hasCache, hasReasoning]
  );

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

    const colors = getModelColors(connectors.map(getKey), MODEL_PALETTE);

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
      ...connectors.map((connector, index) => {
        const aiConnector = aiConnectorsById.get(connector.connector_id);
        return {
          key: connector.connector_id,
          label: aiConnector
            ? removeCreatorPrefix(aiConnector.name, aiConnector.metadata?.display?.model_creator)
            : getKey(connector),
          fullName: aiConnector?.name,
          color: colors[index],
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
      tableLayout="auto"
      compressed
      rowProps={({ key }) => ({ 'data-test-subj': `executionMetadataModelRow-${key}` })}
      data-test-subj="executionMetadataByModelTable"
    />
  );
};
