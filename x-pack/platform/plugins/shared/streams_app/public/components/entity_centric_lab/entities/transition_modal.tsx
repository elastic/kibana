/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';

import oldHostsPageUrl from './assets/old_hosts_page.jpg';
import newExperiencePreviewUrl from './assets/new_experience_preview.jpg';

const TOUR_FLAG_KEY = 'elasticOn_showTour';

export const setTourFlag = (): void => {
  try {
    localStorage.setItem(TOUR_FLAG_KEY, 'true');
  } catch {
    // ignore
  }
};

export const consumeTourFlag = (): boolean => {
  try {
    const val = localStorage.getItem(TOUR_FLAG_KEY);
    if (val === 'true') {
      localStorage.removeItem(TOUR_FLAG_KEY);
      return true;
    }
  } catch {
    // ignore
  }
  return false;
};

const VALUE_PROPS = [
  {
    icon: 'bolt' as const,
    title: "It's fast, even at scale.",
    description:
      'We rebuilt this from the ground up. Thousands of hosts, pods, and clusters load instantly.',
  },
  {
    icon: 'eye' as const,
    title: 'See your system two ways.',
    description:
      'A hexagon health map when you need the big picture. A list when you need to find something specific. Toggle between them anytime.',
  },
  {
    icon: 'layers' as const,
    title: 'More context, fewer clicks.',
    description:
      'The new flyout brings health signals, alerts, dashboards, logs together — without taking you anywhere else.',
  },
];

interface TransitionModalProps {
  onSwitch: () => void;
  onDismiss: () => void;
}

const TransitionModal = ({ onSwitch, onDismiss }: TransitionModalProps) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      css={css`
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1;
      `}
    >
      <EuiPanel
        hasShadow
        paddingSize="l"
        css={css`
          position: relative;
          max-width: 640px;
          width: 100%;
          border-radius: 8px;
          max-height: 90vh;
          overflow-y: auto;
        `}
      >
        <EuiButtonIcon
          iconType="cross"
          aria-label="Close"
          color="text"
          onClick={onDismiss}
          css={css`
            position: absolute;
            top: 12px;
            right: 12px;
            z-index: 1;
          `}
        />
        <EuiTitle size="m">
          <h2>Switch to the new infrastructure experience</h2>
        </EuiTitle>
        <EuiSpacer size="m" />
        <EuiFlexGroup gutterSize="l" responsive={false} alignItems="flexStart">
          <EuiFlexItem>
            <EuiText size="s">
              <h4>Why switch?</h4>
            </EuiText>
            <EuiSpacer size="m" />
            {VALUE_PROPS.map((prop) => (
              <React.Fragment key={prop.icon}>
                <EuiFlexGroup gutterSize="s" responsive={false} alignItems="flexStart">
                  <EuiFlexItem grow={false}>
                    <EuiIcon
                      type={prop.icon}
                      size="m"
                      color="primary"
                      css={css`
                        margin-top: 2px;
                      `}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="xs">
                      <p>
                        <strong>{prop.title}</strong> {prop.description}
                      </p>
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="s" />
              </React.Fragment>
            ))}
          </EuiFlexItem>
          <EuiFlexItem
            grow={false}
            css={css`
              width: 280px;
              flex-shrink: 0;
              margin-top: 32px;
              overflow: hidden;
              border-radius: 6px;
              line-height: 0;
            `}
          >
            <img
              src={newExperiencePreviewUrl}
              alt="Preview of the new infrastructure experience"
              css={css`
                width: 100%;
                display: block;
              `}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiHorizontalRule margin="m" />
        <EuiText size="xs" color="subdued">
          <p>
            <strong>Note:</strong> switching enables the new experience for all users on this
            deployment. You can switch back anytime from{' '}
            <strong>Advanced Settings &gt; Observability</strong>.
            If something feels off, hit &quot;Give feedback&quot; — this is still being shaped
            and your input counts.
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="m">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onDismiss} size="s">
              Don&apos;t show this again
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton fill onClick={onSwitch} iconType="merge" size="s">
              Switch
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </div>
  );
};

interface OldExperiencePageProps {
  onSwitch: () => void;
}

export const OldExperiencePage = ({ onSwitch }: OldExperiencePageProps) => {
  const { euiTheme } = useEuiTheme();
  const [showModal, setShowModal] = useState(true);

  const handleSwitch = () => {
    onSwitch();
  };

  return createPortal(
    <div
      css={css`
        position: fixed;
        inset: 0;
        z-index: 100000;
        overflow: hidden;
        background: ${euiTheme.colors.backgroundBasePlain};
      `}
    >
      <img
        src={oldHostsPageUrl}
        alt="Old Infrastructure Inventory"
        css={css`
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: top left;
          pointer-events: none;
        `}
      />
      {showModal ? (
        <div
          css={css`
            position: absolute;
            inset: 0;
            background: ${euiTheme.colors.backgroundBaseInteractiveOverlay};
          `}
        />
      ) : null}
      {showModal ? (
        <TransitionModal
          onSwitch={handleSwitch}
          onDismiss={() => setShowModal(false)}
        />
      ) : null}
    </div>,
    document.body
  );
};
