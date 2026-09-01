/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiToolTip } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { EisInferenceEndpointMetadata } from '@kbn/inference-common';
import React, { useState } from 'react';

const NEW_BADGE_WINDOW_DAYS = 90;

const newLabel = i18n.translate(
  'xpack.agentBuilder.conversationInput.connectorSelector.modelBadge.new',
  { defaultMessage: 'New' }
);

const openWeightsLabel = i18n.translate(
  'xpack.agentBuilder.conversationInput.connectorSelector.modelBadge.openWeights',
  { defaultMessage: 'Open weights' }
);

const extendedReasoningLabel = i18n.translate(
  'xpack.agentBuilder.conversationInput.connectorSelector.modelBadge.extendedReasoning',
  { defaultMessage: 'Extended reasoning' }
);

const balancedLabel = i18n.translate(
  'xpack.agentBuilder.conversationInput.connectorSelector.modelBadge.balanced',
  { defaultMessage: 'Balanced' }
);

const highThroughputLabel = i18n.translate(
  'xpack.agentBuilder.conversationInput.connectorSelector.modelBadge.highThroughput',
  { defaultMessage: 'High throughput' }
);

const extendedReasoningTooltip = i18n.translate(
  'xpack.agentBuilder.conversationInput.connectorSelector.modelBadge.extendedReasoning.tooltip',
  { defaultMessage: 'Best for complex analysis, ES|QL-heavy dashboards. Higher latency and cost.' }
);

const balancedTooltip = i18n.translate(
  'xpack.agentBuilder.conversationInput.connectorSelector.modelBadge.balanced.tooltip',
  { defaultMessage: 'General-purpose agents, tool orchestration, real-time interactions.' }
);

const highThroughputTooltip = i18n.translate(
  'xpack.agentBuilder.conversationInput.connectorSelector.modelBadge.highThroughput.tooltip',
  { defaultMessage: 'Latency-sensitive tasks, high-concurrency. Lower reasoning depth.' }
);

const openWeightsTooltip = i18n.translate(
  'xpack.agentBuilder.conversationInput.connectorSelector.modelBadge.openWeights.tooltip',
  { defaultMessage: 'Model weights are publicly available and can be self-hosted.' }
);

const modelCapabilitiesAriaLabel = i18n.translate(
  'xpack.agentBuilder.conversationInput.connectorSelector.modelBadge.capabilitiesAriaLabel',
  { defaultMessage: 'View model capabilities' }
);

const isRecentRelease = (releaseDate: string | undefined): boolean => {
  if (!releaseDate) return false;
  const parsed = Date.parse(releaseDate);
  if (isNaN(parsed)) return false;
  const ageMs = Date.now() - parsed;
  return ageMs >= 0 && ageMs <= NEW_BADGE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
};

interface ModelBadgesProps {
  metadata?: EisInferenceEndpointMetadata;
}

/** Always-visible "New" badge for recently released models. */
export const ModelNewBadge: React.FC<ModelBadgesProps> = ({ metadata }) => {
  if (!isRecentRelease(metadata?.heuristics?.release_date)) return null;
  return (
    <EuiBadge color="success" data-test-subj="modelBadgeNew">
      {newLabel}
    </EuiBadge>
  );
};

/** Capability badges (Extended reasoning, Balanced, High throughput, Open weights). */
const ModelCapabilityBadges: React.FC<ModelBadgesProps> = ({ metadata }) => {
  const properties: string[] = metadata?.heuristics?.properties ?? [];

  const showExtendedReasoning = properties.includes('capable');
  const showBalanced = properties.includes('balanced');
  const showHighThroughput = properties.includes('efficient');
  const showOpenWeights = properties.includes('open-weights');

  if (!showExtendedReasoning && !showBalanced && !showHighThroughput && !showOpenWeights) {
    return null;
  }

  return (
    <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center" wrap={false}>
      {showExtendedReasoning && (
        <EuiFlexItem grow={false}>
          <EuiToolTip content={extendedReasoningTooltip}>
            <EuiBadge color="primary" tabIndex={0} data-test-subj="modelBadgeExtendedReasoning">
              {extendedReasoningLabel}
            </EuiBadge>
          </EuiToolTip>
        </EuiFlexItem>
      )}
      {showBalanced && (
        <EuiFlexItem grow={false}>
          <EuiToolTip content={balancedTooltip}>
            <EuiBadge color="hollow" tabIndex={0} data-test-subj="modelBadgeBalanced">
              {balancedLabel}
            </EuiBadge>
          </EuiToolTip>
        </EuiFlexItem>
      )}
      {showHighThroughput && (
        <EuiFlexItem grow={false}>
          <EuiToolTip content={highThroughputTooltip}>
            <EuiBadge color="hollow" tabIndex={0} data-test-subj="modelBadgeHighThroughput">
              {highThroughputLabel}
            </EuiBadge>
          </EuiToolTip>
        </EuiFlexItem>
      )}
      {showOpenWeights && (
        <EuiFlexItem grow={false}>
          <EuiToolTip content={openWeightsTooltip}>
            <EuiBadge color="hollow" tabIndex={0} data-test-subj="modelBadgeOpenWeights">
              {openWeightsLabel}
            </EuiBadge>
          </EuiToolTip>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

/**
 * Shows a ⓘ icon that expands into capability badges on hover.
 * Renders nothing for models with no capability properties.
 */
export const ModelBadgesReveal: React.FC<ModelBadgesProps> = ({ metadata }) => {
  const [isHovered, setIsHovered] = useState(false);

  const properties: string[] = metadata?.heuristics?.properties ?? [];
  const hasCapabilities = properties.some((p) =>
    ['capable', 'balanced', 'efficient', 'open-weights'].includes(p)
  );

  if (!hasCapabilities) return null;

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      css={css`
        display: flex;
        align-items: center;
      `}
    >
      {isHovered ? (
        <ModelCapabilityBadges metadata={metadata} />
      ) : (
        <EuiIcon
          type="info"
          size="s"
          color="subdued"
          aria-label={modelCapabilitiesAriaLabel}
          data-test-subj="modelBadgesRevealIcon"
        />
      )}
    </div>
  );
};
