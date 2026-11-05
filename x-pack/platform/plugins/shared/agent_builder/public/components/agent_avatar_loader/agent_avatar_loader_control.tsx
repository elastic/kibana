/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useId, useRef, useState } from 'react';
import {
  EuiButton,
  EuiCheckableCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { AiButton } from '@kbn/shared-ux-ai-components';
import {
  LOADER_IDS_BY_SCENARIO,
  MotionLoader,
  setCustomPanelShimmer,
  setLoader,
  setNightshiftInvestigatingPreview,
  setNightshiftInvestigatingShimmer,
  setWorkersRunningPreview,
  setWorkersRunningShimmer,
  useCustomPanelShimmer,
  useLoader,
  useNightshiftInvestigatingPreview,
  useNightshiftInvestigatingShimmer,
  useWorkersRunningPreview,
  useWorkersRunningShimmer,
  type LoaderId,
  type LoaderScenario,
} from '@kbn/custom-content-renderer';
import { setChatStatusShimmer } from '../../application/components/conversations/timeline/chat_status_shimmer';
import { useChatStatusShimmer } from '../../application/components/conversations/timeline/use_chat_status_shimmer';

const FLYOUT_TITLE_ID = 'agentBuilderLoaderFlyoutTitle';

const labels = {
  open: i18n.translate('xpack.agentBuilder.loaders.openControl', {
    defaultMessage: 'Loaders',
  }),
  title: i18n.translate('xpack.agentBuilder.loaders.flyoutTitle', {
    defaultMessage: 'Loaders',
  }),
  agentAvatar: i18n.translate('xpack.agentBuilder.loaders.agentAvatarTitle', {
    defaultMessage: 'Agent avatar',
  }),
  agentAvatarDescription: i18n.translate('xpack.agentBuilder.loaders.agentAvatarDescription', {
    defaultMessage: 'Shown in place of the agent avatar while a response is in progress.',
  }),
  customPanel: i18n.translate('xpack.agentBuilder.loaders.customPanelTitle', {
    defaultMessage: 'Custom panel',
  }),
  customPanelDescription: i18n.translate('xpack.agentBuilder.loaders.customPanelDescription', {
    defaultMessage: 'Shown while a custom dashboard panel is being generated.',
  }),
  workersRunning: i18n.translate('xpack.agentBuilder.loaders.workersRunningTitle', {
    defaultMessage: 'Workers running',
  }),
  workersRunningDescription: i18n.translate(
    'xpack.agentBuilder.loaders.workersRunningDescription',
    {
      defaultMessage: 'Shown on Alert Zero while workers run in the background.',
    }
  ),
  orbitRing: i18n.translate('xpack.agentBuilder.loaders.orbitRingLabel', {
    defaultMessage: 'Orbit ring',
  }),
  orbitRingDescription: i18n.translate('xpack.agentBuilder.loaders.orbitRingDescription', {
    defaultMessage: 'Eight dots pulse clockwise around a ring.',
  }),
  elastic: i18n.translate('xpack.agentBuilder.loaders.elasticLabel', {
    defaultMessage: 'Elastic logo',
  }),
  elasticDescription: i18n.translate('xpack.agentBuilder.loaders.elasticDescription', {
    defaultMessage: 'The Elastic logo draws in a loop.',
  }),
  scanDots: i18n.translate('xpack.agentBuilder.loaders.scanDotsLabel', {
    defaultMessage: 'Scan',
  }),
  scanDotsDescription: i18n.translate('xpack.agentBuilder.loaders.scanDotsDescription', {
    defaultMessage: 'Each column of dots lights from left to right.',
  }),
  pulseDots: i18n.translate('xpack.agentBuilder.loaders.pulseDotsLabel', {
    defaultMessage: 'Pulse dots',
  }),
  pulseDotsDescription: i18n.translate('xpack.agentBuilder.loaders.pulseDotsDescription', {
    defaultMessage: 'The center dots light, then the dots around them.',
  }),
  shimmer: i18n.translate('xpack.agentBuilder.loaders.shimmerLabel', {
    defaultMessage: 'Shimmering text',
  }),
  shimmerDescription: i18n.translate('xpack.agentBuilder.loaders.shimmerDescription', {
    defaultMessage: 'A highlight sweeps across the status text.',
  }),
  chatShimmerDescription: i18n.translate('xpack.agentBuilder.loaders.chatShimmerDescription', {
    defaultMessage:
      'A highlight sweeps across status text while a tool is running or context is compacting.',
  }),
  workersShimmerDescription: i18n.translate(
    'xpack.agentBuilder.loaders.workersShimmerDescription',
    {
      defaultMessage: 'A highlight sweeps across the workers running title.',
    }
  ),
  nightshiftShimmerDescription: i18n.translate(
    'xpack.agentBuilder.loaders.nightshiftShimmerDescription',
    {
      defaultMessage:
        'A highlight sweeps across the in progress status. Off restores the gradient label and typing dots.',
    }
  ),
  nightshift: i18n.translate('xpack.agentBuilder.loaders.nightshiftTitle', {
    defaultMessage: 'Nightshift',
  }),
  nightshiftDescription: i18n.translate('xpack.agentBuilder.loaders.nightshiftDescription', {
    defaultMessage: 'Replaces the Nightshift mark while investigations are underway.',
  }),
  showNightshiftInvestigating: i18n.translate(
    'xpack.agentBuilder.loaders.showNightshiftInvestigating',
    {
      defaultMessage: 'Show investigating',
    }
  ),
  hideNightshiftInvestigating: i18n.translate(
    'xpack.agentBuilder.loaders.hideNightshiftInvestigating',
    {
      defaultMessage: 'Hide investigating',
    }
  ),
  showWorkersRunning: i18n.translate('xpack.agentBuilder.loaders.showWorkersRunning', {
    defaultMessage: 'Show workers running',
  }),
  hideWorkersRunning: i18n.translate('xpack.agentBuilder.loaders.hideWorkersRunning', {
    defaultMessage: 'Hide workers running',
  }),
};

const LOADER_COPY: Record<LoaderId, { label: string; description: string }> = {
  orbitRing: { label: labels.orbitRing, description: labels.orbitRingDescription },
  elastic: { label: labels.elastic, description: labels.elasticDescription },
  scanDots: { label: labels.scanDots, description: labels.scanDotsDescription },
  pulseDots: { label: labels.pulseDots, description: labels.pulseDotsDescription },
};

const SCENARIO_COPY: Record<LoaderScenario, { title: string; description: string }> = {
  agentAvatar: { title: labels.agentAvatar, description: labels.agentAvatarDescription },
  customPanel: { title: labels.customPanel, description: labels.customPanelDescription },
  workersRunning: {
    title: labels.workersRunning,
    description: labels.workersRunningDescription,
  },
  nightshift: {
    title: labels.nightshift,
    description: labels.nightshiftDescription,
  },
};

const ChatStatusShimmerToggle = () => {
  const enabled = useChatStatusShimmer();

  return (
    <>
      <EuiSpacer size="m" />
      <EuiSwitch
        label={labels.shimmer}
        checked={enabled}
        compressed
        onChange={(event) => setChatStatusShimmer(event.target.checked)}
        data-test-subj="chatStatusShimmerToggle"
      />
      <EuiSpacer size="xs" />
      <EuiText size="xs" color="subdued">
        <p>{labels.chatShimmerDescription}</p>
      </EuiText>
    </>
  );
};

const CustomPanelShimmerToggle = () => {
  const enabled = useCustomPanelShimmer();

  return (
    <>
      <EuiSpacer size="m" />
      <EuiSwitch
        label={labels.shimmer}
        checked={enabled}
        compressed
        onChange={(event) => setCustomPanelShimmer(event.target.checked)}
        data-test-subj="customPanelShimmerToggle"
      />
      <EuiSpacer size="xs" />
      <EuiText size="xs" color="subdued">
        <p>{labels.shimmerDescription}</p>
      </EuiText>
    </>
  );
};

const NightshiftInvestigatingShimmerToggle = () => {
  const enabled = useNightshiftInvestigatingShimmer();

  return (
    <>
      <EuiSpacer size="m" />
      <EuiSwitch
        label={labels.shimmer}
        checked={enabled}
        compressed
        onChange={(event) => setNightshiftInvestigatingShimmer(event.target.checked)}
        data-test-subj="nightshiftInvestigatingShimmerToggle"
      />
      <EuiSpacer size="xs" />
      <EuiText size="xs" color="subdued">
        <p>{labels.nightshiftShimmerDescription}</p>
      </EuiText>
    </>
  );
};

const NightshiftInvestigatingPreviewAction = () => {
  const preview = useNightshiftInvestigatingPreview();

  return (
    <>
      <EuiSpacer size="m" />
      <EuiButton
        size="s"
        iconType={preview ? 'cross' : 'play'}
        onClick={() => setNightshiftInvestigatingPreview(!preview)}
        data-test-subj="nightshiftInvestigatingPreviewAction"
      >
        {preview ? labels.hideNightshiftInvestigating : labels.showNightshiftInvestigating}
      </EuiButton>
    </>
  );
};

const WorkersRunningPreviewAction = () => {
  const preview = useWorkersRunningPreview();

  return (
    <>
      <EuiSpacer size="m" />
      <EuiButton
        size="s"
        iconType={preview ? 'cross' : 'play'}
        onClick={() => setWorkersRunningPreview(!preview)}
        data-test-subj="workersRunningPreviewAction"
      >
        {preview ? labels.hideWorkersRunning : labels.showWorkersRunning}
      </EuiButton>
    </>
  );
};

const WorkersRunningShimmerToggle = () => {
  const enabled = useWorkersRunningShimmer();

  return (
    <>
      <EuiSpacer size="m" />
      <EuiSwitch
        label={labels.shimmer}
        checked={enabled}
        compressed
        onChange={(event) => setWorkersRunningShimmer(event.target.checked)}
        data-test-subj="workersRunningShimmerToggle"
      />
      <EuiSpacer size="xs" />
      <EuiText size="xs" color="subdued">
        <p>{labels.workersShimmerDescription}</p>
      </EuiText>
    </>
  );
};

const LoaderChoices: React.FC<{ scenario: LoaderScenario }> = ({ scenario }) => {
  const { euiTheme } = useEuiTheme();
  const selectedLoaderId = useLoader(scenario);
  const copy = SCENARIO_COPY[scenario];

  const previewStyles = css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    inline-size: ${euiTheme.size.xl};
    block-size: ${euiTheme.size.xl};
  `;

  return (
    <div data-test-subj={`loaderChoices-${scenario}`}>
      <EuiTitle size="xs">
        <h3>{copy.title}</h3>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <EuiText size="s" color="subdued">
        <p>{copy.description}</p>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiFlexGroup direction="column" gutterSize="s">
        {LOADER_IDS_BY_SCENARIO[scenario].map((loaderId) => {
          const loaderCopy = LOADER_COPY[loaderId];
          return (
            <EuiFlexItem key={loaderId} grow={false}>
              <EuiCheckableCard
                id={`loaderOption-${scenario}-${loaderId}`}
                name={`loader-${scenario}`}
                label={loaderCopy.label}
                checkableType="radio"
                checked={selectedLoaderId === loaderId}
                onChange={() => setLoader(scenario, loaderId)}
                data-test-subj={`loaderOption-${scenario}-${loaderId}`}
              >
                <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <span css={previewStyles}>
                      <MotionLoader scenario={scenario} loaderId={loaderId} decorative />
                    </span>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="xs" color="subdued">
                      {loaderCopy.description}
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiCheckableCard>
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>
      {scenario === 'agentAvatar' && <ChatStatusShimmerToggle />}
      {scenario === 'customPanel' && <CustomPanelShimmerToggle />}
      {scenario === 'workersRunning' && (
        <>
          <WorkersRunningShimmerToggle />
          <WorkersRunningPreviewAction />
        </>
      )}
      {scenario === 'nightshift' && (
        <>
          <NightshiftInvestigatingShimmerToggle />
          <NightshiftInvestigatingPreviewAction />
        </>
      )}
    </div>
  );
};

export const AgentAvatarLoaderControl: React.FC = () => {
  const flyoutId = useId();
  const buttonRef = useRef<HTMLButtonElement | HTMLAnchorElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  const onClose = useCallback((event: MouseEvent | TouchEvent | KeyboardEvent) => {
    if (event.target instanceof Node && buttonRef.current?.contains(event.target)) {
      return;
    }
    setIsOpen(false);
  }, []);

  return (
    <>
      <AiButton
        iconOnly
        iconType="inspect"
        size="s"
        variant={isOpen ? 'accent' : 'base'}
        withToolTip
        buttonRef={buttonRef}
        aria-label={labels.open}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-controls={isOpen ? flyoutId : undefined}
        onClick={() => setIsOpen((open) => !open)}
        data-test-subj="agentBuilderLoaderControl"
      />
      {isOpen && (
        <EuiFlyout
          id={flyoutId}
          ownFocus
          type="push"
          size="s"
          onClose={onClose}
          aria-labelledby={FLYOUT_TITLE_ID}
          data-test-subj="agentBuilderLoaderFlyout"
        >
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="m">
              <h2 id={FLYOUT_TITLE_ID}>{labels.title}</h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <LoaderChoices scenario="agentAvatar" />
            <EuiSpacer size="l" />
            <LoaderChoices scenario="customPanel" />
            <EuiSpacer size="l" />
            <LoaderChoices scenario="workersRunning" />
            <EuiSpacer size="l" />
            <LoaderChoices scenario="nightshift" />
          </EuiFlyoutBody>
        </EuiFlyout>
      )}
    </>
  );
};
