/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiPopover,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

import oldHostsPageUrl from './assets/old_hosts_page.png';
import newExperiencePreviewUrl from './assets/new_experience_preview.png';

/** Native pixel size of `old_hosts_page` (must match the bundled asset). */
const OLD_HOSTS_PAGE_WIDTH_PX = 3456;
const OLD_HOSTS_PAGE_HEIGHT_PX = 1828;
/** ⋮ button position in screenshot coordinates (top-left origin, 3456×1828 asset). */
const OLD_PAGE_KEBAB_TOP_PX =
  Math.round(66 * (OLD_HOSTS_PAGE_HEIGHT_PX / 541)) - 90;
const OLD_PAGE_KEBAB_RIGHT_PX =
  Math.round(130 * (OLD_HOSTS_PAGE_WIDTH_PX / 1024)) - 158;

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
              line-height: 0;
            `}
          >
            <img
              src={newExperiencePreviewUrl}
              alt="Preview of the new infrastructure experience"
              css={css`
                width: 100%;
                display: block;
                border-radius: 6px;
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
  /** When provided, renders the ⋮ kebab toggle on the old-page overlay. */
  onToggleNewExperience?: (enabled: boolean) => void;
  /** Whether to show the transition modal on mount (default: true). */
  showTransitionModal?: boolean;
  /** Mirrors Advanced Settings → New infrastructure experience. */
  newExperienceEnabled?: boolean;
}

/**
 * Small kebab menu overlaid on the old-experience screenshot so users
 * can flip back to the new experience without visiting Settings.
 */
const OldPageKebab = ({
  onToggle,
  newExperienceEnabled,
}: {
  onToggle: (enabled: boolean) => void;
  newExperienceEnabled: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div
      css={css`
        position: absolute;
        top: ${(OLD_PAGE_KEBAB_TOP_PX / OLD_HOSTS_PAGE_HEIGHT_PX) * 100}%;
        right: ${(OLD_PAGE_KEBAB_RIGHT_PX / OLD_HOSTS_PAGE_WIDTH_PX) * 100}%;
        z-index: 100001;
      `}
    >
      <EuiPopover
        button={
          <EuiButtonIcon
            iconType="boxesVertical"
            aria-label={i18n.translate(
              'xpack.streams.entityCentricLab.oldPage.moreActions',
              { defaultMessage: 'More actions' }
            )}
            color="text"
            display="base"
            size="s"
            onClick={() => setIsOpen(!isOpen)}
            data-test-subj="oldPageMoreActions"
          />
        }
        isOpen={isOpen}
        closePopover={() => setIsOpen(false)}
        anchorPosition="downRight"
        panelPaddingSize="none"
        repositionOnScroll
      >
        <EuiContextMenuPanel
          size="s"
          items={[
            <EuiContextMenuItem
              key="new-experience-toggle"
              icon="visGauge"
              onClick={() => {
                setIsOpen(false);
                onToggle(!newExperienceEnabled);
              }}
              css={css`
                cursor: pointer;
              `}
              data-test-subj="oldPageNewExperienceItem"
            >
              <EuiFlexGroup
                alignItems="center"
                justifyContent="spaceBetween"
                gutterSize="s"
                responsive={false}
              >
                <EuiFlexItem grow={false}>
                  {i18n.translate(
                    'xpack.streams.entityCentricLab.oldPage.newExperience',
                    { defaultMessage: 'New experience' }
                  )}
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiSwitch
                    label=""
                    showLabel={false}
                    checked={newExperienceEnabled}
                    onChange={(e) => {
                      setIsOpen(false);
                      onToggle(e.target.checked);
                    }}
                    compressed
                    data-test-subj="oldPageNewExperienceSwitch"
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiContextMenuItem>,
            <EuiHorizontalRule key="old-page-more-actions-hr" margin="none" />,
            <EuiContextMenuItem
              key="documentation"
              icon="documentation"
              onClick={() => {
                setIsOpen(false);
                window.open('https://ela.st/entity-centric-docs', '_blank');
              }}
              data-test-subj="oldPageDocumentation"
            >
              {i18n.translate(
                'xpack.streams.entityCentricLab.entities.moreActions.documentation',
                { defaultMessage: 'View documentation' }
              )}
            </EuiContextMenuItem>,
            <EuiContextMenuItem
              key="feedback"
              icon="editorComment"
              onClick={() => {
                setIsOpen(false);
                window.open('https://ela.st/entity-centric-feedback', '_blank');
              }}
              data-test-subj="oldPageFeedback"
            >
              {i18n.translate(
                'xpack.streams.entityCentricLab.entities.moreActions.feedback',
                { defaultMessage: 'Feedback' }
              )}
            </EuiContextMenuItem>,
          ]}
        />
      </EuiPopover>
    </div>
  );
};

export const OldExperiencePage = ({
  onSwitch,
  onToggleNewExperience,
  showTransitionModal = true,
  newExperienceEnabled = false,
}: OldExperiencePageProps) => {
  const { euiTheme } = useEuiTheme();
  const [showModal, setShowModal] = useState(showTransitionModal);

  // Parent turned off the transition flow — never leave the scrim up.
  useEffect(() => {
    if (!showTransitionModal) {
      setShowModal(false);
    }
  }, [showTransitionModal]);

  // Parent turned the transition flow back on — show modal + scrim again.
  useEffect(() => {
    if (showTransitionModal) {
      setShowModal(true);
    }
  }, [showTransitionModal]);

  const modalActive = showTransitionModal && showModal;

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
      <div
        css={css`
          position: relative;
          /* Largest “contain” box that fits the viewport (same as object-fit: contain). */
          width: min(
            100vw,
            calc(100vh * ${OLD_HOSTS_PAGE_WIDTH_PX} / ${OLD_HOSTS_PAGE_HEIGHT_PX})
          );
          height: min(
            100vh,
            calc(100vw * ${OLD_HOSTS_PAGE_HEIGHT_PX} / ${OLD_HOSTS_PAGE_WIDTH_PX})
          );
        `}
      >
        <img
          src={oldHostsPageUrl}
          alt="Old Infrastructure Inventory"
          width={OLD_HOSTS_PAGE_WIDTH_PX}
          height={OLD_HOSTS_PAGE_HEIGHT_PX}
          css={css`
            display: block;
            width: 100%;
            height: 100%;
            pointer-events: none;
          `}
        />
        {!modalActive && onToggleNewExperience ? (
          <OldPageKebab
            onToggle={onToggleNewExperience}
            newExperienceEnabled={newExperienceEnabled}
          />
        ) : null}
      </div>
      {modalActive ? (
        <>
          <div
            css={css`
              position: absolute;
              inset: 0;
              background: ${euiTheme.colors.backgroundBaseInteractiveOverlay};
            `}
          />
          <TransitionModal
            onSwitch={handleSwitch}
            onDismiss={() => setShowModal(false)}
          />
        </>
      ) : null}
    </div>,
    document.body
  );
};
