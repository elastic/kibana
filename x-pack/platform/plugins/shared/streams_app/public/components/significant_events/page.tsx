/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButton,
  EuiButtonIcon,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';
import { useStreamsAppBreadcrumbs } from '../../hooks/use_streams_app_breadcrumbs';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { AssetImage } from '../asset_image';
import { StreamsAppPageTemplate } from '../streams_app_page_template';
import { AiOnboardingPanel } from './ai_onboarding_panel';
import { SignificantEventsDetectedView } from './significant_events_detected_view';

// Fixed card height per Figma spec — keeps both states the same size
const CARD_HEIGHT = 434;

export function SignificantEventsPage() {
  const [onboardingStarted, setOnboardingStarted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [hasEvents, setHasEvents] = useState(false);
  const { euiTheme } = useEuiTheme();
  const router = useStreamsAppRouter();

  // After 10 s of "Detecting events…" switch to the full events view
  useEffect(() => {
    if (!isListening || hasEvents) return;
    const timer = setTimeout(() => setHasEvents(true), 10_000);
    return () => clearTimeout(timer);
  }, [isListening, hasEvents]);

  useStreamsAppBreadcrumbs(() => {
    return [
      {
        title: i18n.translate('xpack.streams.significantEvents.breadcrumbTitle', {
          defaultMessage: 'Significant events',
        }),
        path: '/_significant_events',
      },
    ];
  }, []);

  /*
   * Page title — just the title + optional metadata badges.
   * Action buttons live in rightSideItems to mirror the Discover / Dashboards app bar pattern.
   */
  const pageTitle = (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        {i18n.translate('xpack.streams.significantEvents.pageHeaderTitle', {
          defaultMessage: 'Significant events',
        })}
      </EuiFlexItem>
      {hasEvents && (
        <>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">
              {i18n.translate('xpack.streams.significantEvents.continuousBadge', {
                defaultMessage: 'Continuous',
              })}
            </EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon type="clock" size="s" color="subdued" aria-hidden />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s" color="subdued">
                  <span>15 min</span>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </>
      )}
    </EuiFlexGroup>
  );

  /* Right-side items for the app bar — always visible, mirroring Discover/Dashboards pattern */
  /* rightSideItems renders right-to-left, so index 0 = rightmost.
   * Desired visual order (left → right): Run a discovery | Manager | More options
   * Array order (right → left):           More options  | Manager  | Run a discovery
   */
  const headerRightSideItems = [
    <EuiButtonIcon
      key="more-options"
      iconType="boxesVertical"
      size="s"
      color="text"
      aria-label={i18n.translate('xpack.streams.significantEvents.moreOptionsButton', {
        defaultMessage: 'More options',
      })}
      data-test-subj="streamsSignificantEventsMoreOptionsButton"
    />,
    <EuiButton
      key="manager"
      size="s"
      iconType="gear"
      color="text"
      onClick={() => router.push('/_significant_events_advanced_settings', { path: {}, query: {} })}
      data-test-subj="streamsSignificantEventsManagerButton"
    >
      {i18n.translate('xpack.streams.significantEvents.managerButton', {
        defaultMessage: 'Manager',
      })}
    </EuiButton>,
    ...(hasEvents
      ? [
          <EuiButton
            key="run-discovery"
            size="s"
            iconType="sparkles"
            data-test-subj="streamsSignificantEventsRunDiscoveryButton"
          >
            {i18n.translate('xpack.streams.significantEvents.runDiscoveryButton', {
              defaultMessage: 'Run a discovery',
            })}
          </EuiButton>,
        ]
      : []),
  ];

  return (
    <>
      <StreamsAppPageTemplate.Header
        pageTitle={pageTitle}
        rightSideItems={headerRightSideItems}
      />
      <StreamsAppPageTemplate.Body grow noPadding={isListening}>
        {isListening ? (
          /* Listening state — full page layout with loading skeleton when events haven't arrived */
          <SignificantEventsDetectedView isLoading={!hasEvents} />
        ) : (
          /* Onboarding flow — shared card for idle + CLI animation states */
          <div
            css={css`
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100%;
              padding: ${euiTheme.size.base} ${euiTheme.size.l} 112px;
            `}
          >
            {/* Shared card — identical container for both idle and loading states */}
            <div
              css={css`
                width: 100%;
                max-width: 964px;
                border: 1px solid ${euiTheme.colors.borderBaseSubdued};
                border-radius: 6px;
                overflow: hidden;
              `}
            >
              {onboardingStarted ? (
                <>
                  {/* CLI animation state — same fixed height as before */}
                  <div
                    css={css`
                      background: ${euiTheme.colors.backgroundBasePlain};
                      height: ${CARD_HEIGHT}px;
                      display: flex;
                      flex-direction: column;
                      padding: ${euiTheme.size.l} ${euiTheme.size.xxl};
                      gap: ${euiTheme.size.m};
                    `}
                  >
                    <AiOnboardingPanel onStartListening={() => setIsListening(true)} />
                  </div>

                  <div
                    css={css`
                      height: 1px;
                      background: ${euiTheme.colors.borderBaseSubdued};
                    `}
                  />

                  <div
                    css={css`
                      background: ${euiTheme.colors.backgroundBaseSubdued};
                      padding: ${euiTheme.size.l};
                    `}
                  >
                    <EuiFlexGroup
                      gutterSize="xs"
                      alignItems="center"
                      responsive={false}
                      wrap={false}
                    >
                      <EuiFlexItem grow={false}>
                        <EuiText size="s">
                          <strong>
                            {i18n.translate(
                              'xpack.streams.significantEvents.emptyState.learnMore',
                              { defaultMessage: 'Want to learn more?' }
                            )}
                          </strong>
                        </EuiText>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiLink href="#" target="_blank" external>
                          {i18n.translate('xpack.streams.significantEvents.emptyState.readMore', {
                            defaultMessage: 'Read more',
                          })}
                        </EuiLink>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </div>
                </>
              ) : (
                /* Idle state — EuiEmptyPrompt horizontal layout matching StreamsListEmptyPrompt */
                <EuiEmptyPrompt
                  css={{
                    maxInlineSize: '100% !important',
                    '.euiEmptyPrompt__content': {
                      flexBasis: '35%',
                    },
                    '.euiEmptyPrompt__icon': {
                      maxInlineSize: 'unset !important',
                    },
                    '.euiEmptyPrompt__icon .euiImageWrapper': {
                      maxInlineSize: 'unset !important',
                    },
                  }}
                  layout="horizontal"
                  color="plain"
                  icon={
                    <AssetImage
                      type="significantEventsOnboarding"
                      size="fullWidth"
                      css={css`
                        width: 100%;
                        height: 100%;
                        object-fit: cover;
                        object-position: center center;
                        display: block;
                      `}
                    />
                  }
                  title={
                    <h2>
                      {i18n.translate('xpack.streams.significantEvents.emptyState.title', {
                        defaultMessage: 'Enable Significant events',
                      })}
                    </h2>
                  }
                  body={
                    <p>
                      {i18n.translate('xpack.streams.significantEvents.emptyState.body', {
                        defaultMessage:
                          'Get insights into the performance, error handling, data optimisation and current topology mapping and other insights that contribute to a great end-user experience for your system and architecture.',
                      })}
                    </p>
                  }
                  actions={
                    <div
                      css={css`
                        display: flex;
                        gap: ${euiTheme.size.base};
                        align-items: center;
                      `}
                    >
                      {/* Gradient AI button — custom design per Figma */}
                      <button
                        type="button"
                        data-test-subj="streamsSignificantEventsOnboardWithAiButton"
                        onClick={() => setOnboardingStarted(true)}
                        css={css`
                          display: inline-flex;
                          align-items: center;
                          gap: 6px;
                          height: 32px;
                          min-width: 96px;
                          padding: 0 ${euiTheme.size.s};
                          border: none;
                          border-radius: 4px;
                          background: linear-gradient(
                            134.5deg,
                            rgb(217, 232, 255) 3.97%,
                            rgb(236, 226, 254) 65.6%
                          );
                          cursor: pointer;
                          font-family: ${euiTheme.font.family};
                          line-height: 20px;

                          &:hover {
                            filter: brightness(0.96);
                          }
                          &:focus-visible {
                            outline: 2px solid ${euiTheme.colors.primary};
                            outline-offset: 2px;
                          }
                        `}
                      >
                        <EuiIcon
                          type="sparkles"
                          size="s"
                          aria-hidden
                          css={css`
                            color: #1750ba;
                          `}
                        />
                        <span
                          css={css`
                            font-size: 14px;
                            font-weight: ${euiTheme.font.weight.medium};
                            line-height: 20px;
                            background: linear-gradient(
                              171.56deg,
                              #1750ba 2.98%,
                              rgb(107, 60, 159) 66.24%
                            );
                            -webkit-background-clip: text;
                            -webkit-text-fill-color: transparent;
                            background-clip: text;
                            white-space: nowrap;
                          `}
                        >
                          {i18n.translate(
                            'xpack.streams.significantEvents.emptyState.onboardAiButton',
                            { defaultMessage: 'Onboard with Elastic AI' }
                          )}
                        </span>
                      </button>

                      <EuiButton
                        size="s"
                        data-test-subj="streamsSignificantEventsManualSetupButton"
                      >
                        {i18n.translate(
                          'xpack.streams.significantEvents.emptyState.manualSetupButton',
                          { defaultMessage: 'Manual setup' }
                        )}
                      </EuiButton>
                    </div>
                  }
                  footer={
                    <EuiFlexGroup
                      gutterSize="xs"
                      alignItems="center"
                      responsive={false}
                      wrap={false}
                    >
                      <EuiFlexItem grow={false}>
                        <EuiText size="s">
                          <strong>
                            {i18n.translate(
                              'xpack.streams.significantEvents.emptyState.learnMore',
                              { defaultMessage: 'Want to learn more?' }
                            )}
                          </strong>
                        </EuiText>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiLink href="#" target="_blank" external>
                          {i18n.translate('xpack.streams.significantEvents.emptyState.readMore', {
                            defaultMessage: 'Read more',
                          })}
                        </EuiLink>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  }
                />
              )}
            </div>
          </div>
        )}
      </StreamsAppPageTemplate.Body>
    </>
  );
}
