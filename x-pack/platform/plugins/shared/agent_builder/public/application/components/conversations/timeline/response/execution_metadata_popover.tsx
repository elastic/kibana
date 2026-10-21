/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiI18nNumber,
  EuiPopover,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { ConversationRoundStep, ExecutionTerminatedEvent } from '@kbn/agent-builder-common';
import { AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common';
import { getEbtProps } from '@kbn/ebt-click';
import { ExecutionJsonFlyout } from './execution_json_flyout';
import { ExecutionMetadataByModel } from './execution_metadata_by_model';

const POPOVER_WIDTH = 420;
const MIN_MODELS_FOR_TABS = 2;

const labels = {
  tabsLegend: i18n.translate('xpack.agentBuilder.response.metadataPopover.tabsLegend', {
    defaultMessage: 'Execution details view',
  }),
  totalTab: i18n.translate('xpack.agentBuilder.response.metadataPopover.totalTab', {
    defaultMessage: 'Total',
  }),
  byModelTab: i18n.translate('xpack.agentBuilder.response.metadataPopover.byModelTab', {
    defaultMessage: 'By model',
  }),
  reasoningTokens: i18n.translate('xpack.agentBuilder.response.metadataPopover.reasoningTokens', {
    defaultMessage: 'Reasoning tokens',
  }),
  cacheHitTokens: i18n.translate('xpack.agentBuilder.response.metadataPopover.cacheHitTokens', {
    defaultMessage: 'Cache hit tokens',
  }),
  triggerAriaLabel: i18n.translate('xpack.agentBuilder.response.metadataPopover.triggerAriaLabel', {
    defaultMessage: 'Show execution details',
  }),
  popoverAriaLabel: i18n.translate('xpack.agentBuilder.response.metadataPopover.popoverAriaLabel', {
    defaultMessage: 'Execution details',
  }),
  executionTime: i18n.translate('xpack.agentBuilder.response.metadataPopover.executionTime', {
    defaultMessage: 'Execution time',
  }),
  tokensSent: i18n.translate('xpack.agentBuilder.response.metadataPopover.tokensSent', {
    defaultMessage: 'Tokens sent',
  }),
  tokensReceived: i18n.translate('xpack.agentBuilder.response.metadataPopover.tokensReceived', {
    defaultMessage: 'Tokens received',
  }),
  viewResponseJson: i18n.translate('xpack.agentBuilder.response.metadataPopover.viewResponseJson', {
    defaultMessage: 'View response JSON',
  }),
};

const TABS = {
  total: {
    label: labels.totalTab,
    testSubj: 'executionMetadataTotalTab',
    ebtAction: AGENT_BUILDER_UI_EBT.action.conversation.VIEW_ROUND_METADATA_TOTAL,
  },
  byModel: {
    label: labels.byModelTab,
    testSubj: 'executionMetadataByModelTab',
    ebtAction: AGENT_BUILDER_UI_EBT.action.conversation.VIEW_ROUND_METADATA_BY_MODEL,
  },
} as const;

type MetadataTab = keyof typeof TABS;

const TAB_IDS = Object.keys(TABS) as MetadataTab[];

const isMetadataTab = (id: string): id is MetadataTab => TAB_IDS.some((tabId) => tabId === id);

interface ExecutionMetadataPopoverProps {
  executionTerminatedEvent: ExecutionTerminatedEvent;
  steps?: ConversationRoundStep[];
  conversationId?: string;
  agentId?: string;
}

export const ExecutionMetadataPopover: React.FC<ExecutionMetadataPopoverProps> = ({
  executionTerminatedEvent,
  steps,
  conversationId,
  agentId,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isJsonFlyoutOpen, setIsJsonFlyoutOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState<MetadataTab>('total');

  const closePopover = useCallback(() => setIsPopoverOpen(false), []);
  const togglePopover = useCallback(() => setIsPopoverOpen((v) => !v), []);

  const openJsonFlyout = useCallback(() => {
    setIsPopoverOpen(false);
    setIsJsonFlyoutOpen(true);
  }, []);
  const closeJsonFlyout = useCallback(() => setIsJsonFlyoutOpen(false), []);

  const { time_to_last_token: timeMs, model_usage: modelUsage } = executionTerminatedEvent.data;

  if (!timeMs) {
    return null;
  }

  const hasSeveralModels = (modelUsage.connectors?.length ?? 0) >= MIN_MODELS_FOR_TABS;
  const seconds = Math.round(timeMs / 1000);
  const secondsLabel = i18n.translate('xpack.agentBuilder.response.metadataPopover.seconds', {
    defaultMessage: '{seconds}s',
    values: { seconds },
  });

  const trigger = (
    <EuiButtonEmpty
      iconType="clock"
      size="xs"
      color="text"
      onClick={togglePopover}
      aria-label={labels.triggerAriaLabel}
      data-test-subj="executionMetadataPopoverTrigger"
      {...getEbtProps({
        element: AGENT_BUILDER_UI_EBT.element.pageContent,
        action: AGENT_BUILDER_UI_EBT.action.conversation.OPEN_ROUND_METADATA,
        detail: 'conversation',
      })}
    >
      {secondsLabel}
    </EuiButtonEmpty>
  );

  return (
    <>
      <EuiPopover
        button={trigger}
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        anchorPosition="upLeft"
        panelPaddingSize="m"
        display="block"
        aria-label={labels.popoverAriaLabel}
      >
        <EuiFlexGroup
          direction="column"
          gutterSize="s"
          css={css`
            width: ${POPOVER_WIDTH}px;
            max-width: calc(100vw - 4rem);
          `}
        >
          {hasSeveralModels && (
            <EuiFlexItem grow={false}>
              <EuiButtonGroup
                legend={labels.tabsLegend}
                variant="selection"
                idSelected={selectedTab}
                onChange={(id) => {
                  if (isMetadataTab(id)) {
                    setSelectedTab(id);
                  }
                }}
                buttonSize="s"
                isFullWidth
                data-test-subj="executionMetadataTabs"
              >
                {TAB_IDS.map((id) => (
                  <EuiButton
                    key={id}
                    id={id}
                    data-test-subj={TABS[id].testSubj}
                    {...(id === selectedTab
                      ? {}
                      : getEbtProps({
                          element: AGENT_BUILDER_UI_EBT.element.pageContent,
                          action: TABS[id].ebtAction,
                          detail: 'conversation',
                        }))}
                  >
                    {TABS[id].label}
                  </EuiButton>
                ))}
              </EuiButtonGroup>
              <EuiSpacer size="xs" />
            </EuiFlexItem>
          )}
          {hasSeveralModels && selectedTab === 'byModel' ? (
            <ExecutionMetadataByModel modelUsage={modelUsage} />
          ) : (
            <>
              <MetadataRow label={labels.executionTime} value={secondsLabel} />
              <MetadataDivider />
              <MetadataRow
                label={labels.tokensSent}
                value={<EuiI18nNumber value={modelUsage.input_tokens} />}
              />
              {modelUsage.cached_input_tokens !== undefined && (
                <MetadataRow
                  label={labels.cacheHitTokens}
                  value={<EuiI18nNumber value={modelUsage.cached_input_tokens} />}
                  isSubRow
                />
              )}
              <MetadataDivider />
              <MetadataRow
                label={labels.tokensReceived}
                value={<EuiI18nNumber value={modelUsage.output_tokens} />}
              />
              {modelUsage.reasoning_tokens !== undefined && (
                <MetadataRow
                  label={labels.reasoningTokens}
                  value={<EuiI18nNumber value={modelUsage.reasoning_tokens} />}
                  isSubRow
                />
              )}
              <MetadataDivider />
            </>
          )}
          <EuiFlexItem grow={false}>
            <EuiSpacer size="xs" />
            <EuiButton
              iconType="code"
              size="s"
              color="text"
              onClick={openJsonFlyout}
              data-test-subj="executionMetadataViewJsonButton"
              {...getEbtProps({
                element: AGENT_BUILDER_UI_EBT.element.pageContent,
                action: AGENT_BUILDER_UI_EBT.action.conversation.VIEW_JSON,
                detail: 'conversation',
              })}
            >
              {labels.viewResponseJson}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPopover>
      {isJsonFlyoutOpen && (
        <ExecutionJsonFlyout
          executionTerminatedEvent={executionTerminatedEvent}
          steps={steps}
          conversationId={conversationId}
          agentId={agentId}
          onClose={closeJsonFlyout}
        />
      )}
    </>
  );
};

const MetadataDivider: React.FC = () => (
  <EuiFlexItem grow={false}>
    <EuiHorizontalRule margin="none" />
  </EuiFlexItem>
);

interface MetadataRowProps {
  label: string;
  value: React.ReactNode;
  isSubRow?: boolean;
}

const MetadataRow: React.FC<MetadataRowProps> = ({ label, value, isSubRow = false }) => (
  <EuiFlexItem grow={false}>
    <EuiFlexGroup direction="row" justifyContent="spaceBetween" gutterSize="l" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiText size="s" color={isSubRow ? 'subdued' : undefined}>
          {isSubRow ? label : <strong>{label}</strong>}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s" color={isSubRow ? 'subdued' : undefined}>
          {value}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiFlexItem>
);
