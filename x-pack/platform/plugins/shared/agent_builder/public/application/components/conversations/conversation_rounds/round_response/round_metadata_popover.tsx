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
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiI18nNumber,
  EuiPopover,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { ConversationRound } from '@kbn/agent-builder-common';
import { AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common';
import { getEbtProps } from '@kbn/ebt-click';
import { RoundJsonFlyout } from './round_json_flyout';

const MIN_WIDTH = 260;

const labels = {
  triggerAriaLabel: i18n.translate('xpack.agentBuilder.round.metadataPopover.triggerAriaLabel', {
    defaultMessage: 'Show round details',
  }),
  popoverAriaLabel: i18n.translate('xpack.agentBuilder.round.metadataPopover.popoverAriaLabel', {
    defaultMessage: 'Round details',
  }),
  execution: i18n.translate('xpack.agentBuilder.round.metadataPopover.execution', {
    defaultMessage: 'Execution',
  }),
  tokensSent: i18n.translate('xpack.agentBuilder.round.metadataPopover.tokensSent', {
    defaultMessage: 'Tokens sent',
  }),
  tokensReceived: i18n.translate('xpack.agentBuilder.round.metadataPopover.tokensReceived', {
    defaultMessage: 'Tokens received',
  }),
  viewResponseJson: i18n.translate('xpack.agentBuilder.round.metadataPopover.viewResponseJson', {
    defaultMessage: 'View response JSON',
  }),
};

interface RoundMetadataPopoverProps {
  rawRound: ConversationRound;
}

export const RoundMetadataPopover: React.FC<RoundMetadataPopoverProps> = ({ rawRound }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isJsonFlyoutOpen, setIsJsonFlyoutOpen] = useState(false);

  const closePopover = useCallback(() => setIsPopoverOpen(false), []);
  const togglePopover = useCallback(() => setIsPopoverOpen((v) => !v), []);

  const openJsonFlyout = useCallback(() => {
    setIsPopoverOpen(false);
    setIsJsonFlyoutOpen(true);
  }, []);
  const closeJsonFlyout = useCallback(() => setIsJsonFlyoutOpen(false), []);

  const { time_to_last_token: timeMs, model_usage: modelUsage } = rawRound;

  if (!timeMs) {
    return null;
  }

  const seconds = Math.round(timeMs / 1000);
  const secondsLabel = i18n.translate('xpack.agentBuilder.round.metadataPopover.seconds', {
    defaultMessage: '{seconds}s',
    values: { seconds },
  });

  const trigger = (
    <EuiButtonEmpty
      iconType="clock"
      size="s"
      color="text"
      onClick={togglePopover}
      aria-label={labels.triggerAriaLabel}
      data-test-subj="roundMetadataPopoverTrigger"
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
            min-width: ${MIN_WIDTH}px;
          `}
        >
          <MetadataRow label={labels.execution} value={secondsLabel} />
          <MetadataRow
            label={labels.tokensSent}
            value={<EuiI18nNumber value={modelUsage.input_tokens} />}
          />
          <MetadataRow
            label={labels.tokensReceived}
            value={<EuiI18nNumber value={modelUsage.output_tokens} />}
          />
          <EuiFlexItem grow={false}>
            <EuiHorizontalRule margin="xs" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              iconType="editorCodeBlock"
              size="s"
              color="text"
              onClick={openJsonFlyout}
              data-test-subj="roundMetadataPopoverViewJsonButton"
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
      {isJsonFlyoutOpen && <RoundJsonFlyout rawRound={rawRound} onClose={closeJsonFlyout} />}
    </>
  );
};

interface MetadataRowProps {
  label: string;
  value: React.ReactNode;
}

const MetadataRow: React.FC<MetadataRowProps> = ({ label, value }) => (
  <EuiFlexItem grow={false}>
    <EuiFlexGroup direction="row" justifyContent="spaceBetween" gutterSize="l" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiText size="s" color="subdued">
          {label}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s">{value}</EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiFlexItem>
);
