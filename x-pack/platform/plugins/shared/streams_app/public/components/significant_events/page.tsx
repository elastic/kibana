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
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiText,
  EuiTitle,
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
   * The page header always shows the Manager and More options buttons.
   * "Continuous" badge, "15 min", and "Run a discovery" only appear
   * once events have been detected.
   */
  const pageTitle = (
    <EuiFlexGroup
      justifyContent="spaceBetween"
      alignItems="center"
      responsive={false}
      gutterSize="s"
    >
      {/* Left side — title + optional metadata badges */}
      <EuiFlexItem grow={false}>
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
      </EuiFlexItem>

      {/* Right side — always-visible Manager + More options; Run a discovery when hasEvents */}
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          {hasEvents && (
            <EuiFlexItem grow={false}>
              <EuiButton size="s" iconType="sparkles" data-test-subj="streamsSignificantEventsRunDiscoveryButton">
                {i18n.translate('xpack.streams.significantEvents.runDiscoveryButton', {
                  defaultMessage: 'Run a discovery',
                })}
              </EuiButton>
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              iconType="gear"
              onClick={() => router.push('/_significant_events_advanced_settings')}
              data-test-subj="streamsSignificantEventsManagerButton"
            >
              {i18n.translate('xpack.streams.significantEvents.managerButton', {
                defaultMessage: 'Manager',
              })}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType="boxesVertical"
              size="s"
              color="text"
              aria-label={i18n.translate('xpack.streams.significantEvents.moreOptionsButton', {
                defaultMessage: 'More options',
              })}
              data-test-subj="streamsSignificantEventsMoreOptionsButton"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <>
      <StreamsAppPageTemplate.Header pageTitle={pageTitle} />
      <StreamsAppPageTemplate.Body grow noPadding={hasEvents}>
        {hasEvents ? (
          /* Full events view after detection completes */
          <SignificantEventsDetectedView />
        ) : isListening ? (
          /* Listening empty state — centered panel */
          <div
            css={css`
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100%;
              padding: ${euiTheme.size.base} ${euiTheme.size.l};
            `}
          >
            <div
              css={css`
                background: ${euiTheme.colors.backgroundBaseSubdued};
                border-radius: 4px;
                width: 660px;
                height: 516px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: ${euiTheme.size.l};
                padding: ${euiTheme.size.l};
              `}
            >
              <AssetImage type="significantEventsListening" size={174} />
              <div
                css={css`
                  display: flex;
                  flex-direction: column;
                  gap: ${euiTheme.size.s};
                  align-items: center;
                  text-align: center;
                  width: 420px;
                `}
              >
                <EuiTitle size="xs">
                  <h3>
                    {i18n.translate('xpack.streams.significantEvents.listening.title', {
                      defaultMessage: 'Currently no insights detected',
                    })}
                  </h3>
                </EuiTitle>
                <EuiText size="s">
                  <p>
                    {i18n.translate('xpack.streams.significantEvents.listening.description', {
                      defaultMessage:
                        'We are listening for events, it seems your system is currently running smoothly.',
                    })}
                  </p>
                </EuiText>
              </div>
              <EuiButton
                size="s"
                isDisabled
                isLoading
                data-test-subj="streamsSignificantEventsDetectingButton"
              >
                {i18n.translate('xpack.streams.significantEvents.listening.detectingButton', {
                  defaultMessage: 'Detecting events ...',
                })}
              </EuiButton>
            </div>
          </div>
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
              {/* Main content area — fixed height so both states occupy exactly the same space */}
              <div
                css={[
                  css`
                    background: ${euiTheme.colors.backgroundBasePlain};
                    height: ${CARD_HEIGHT}px;
                    display: flex;
                  `,
                  onboardingStarted
                    ? css`
                        flex-direction: column;
                        padding: ${euiTheme.size.l} ${euiTheme.size.xxl};
                        gap: ${euiTheme.size.m};
                      `
                    : css`
                        flex-direction: row;
                        align-items: center;
                        gap: 32px;
                      `,
                ]}
              >
                {onboardingStarted ? (
                  <AiOnboardingPanel onStartListening={() => setIsListening(true)} />
                ) : (
                  <>
                    {/* Left panel — fixed 375px per Figma, text + buttons */}
                    <div
                      css={css`
                        width: 375px;
                        flex-shrink: 0;
                        height: 100%;
                        display: flex;
                        flex-direction: column;
                        gap: ${euiTheme.size.base};
                        padding: ${euiTheme.size.xl} ${euiTheme.size.l} ${euiTheme.size.l};
                      `}
                    >
                      <EuiTitle size="l">
                        <h2>
                          {i18n.translate('xpack.streams.significantEvents.emptyState.title', {
                            defaultMessage: 'Enable Significant events',
                          })}
                        </h2>
                      </EuiTitle>
                      <EuiText size="s">
                        <p>
                          {i18n.translate('xpack.streams.significantEvents.emptyState.body', {
                            defaultMessage:
                              'Get insights into the performance, error handling, data optimisation and current topology mapping and other insights that contribute to a great end-user experience for your system and architecture.',
                          })}
                        </p>
                      </EuiText>
                      {/* Extra top padding separates buttons from description */}
                      <div
                        css={css`
                          display: flex;
                          gap: ${euiTheme.size.base};
                          align-items: center;
                          padding-top: ${euiTheme.size.base};
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
                    </div>

                    {/* Right — illustration fills remaining space */}
                    <div
                      css={css`
                        flex: 1;
                        min-width: 0;
                        height: 100%;
                        overflow: hidden;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        background: #e8f1ff;
                      `}
                    >
                      <AssetImage type="significantEventsOnboarding" size={360} />
                    </div>
                  </>
                )}
              </div>

              {/* Separator */}
              <div
                css={css`
                  height: 1px;
                  background: ${euiTheme.colors.borderBaseSubdued};
                `}
              />

              {/* Footer — shared by both onboarding states */}
              <div
                css={css`
                  background: ${euiTheme.colors.backgroundBaseSubdued};
                  padding: ${euiTheme.size.l};
                `}
              >
                <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap={false}>
                  <EuiFlexItem grow={false}>
                    <EuiText size="s">
                      <strong>
                        {i18n.translate('xpack.streams.significantEvents.emptyState.learnMore', {
                          defaultMessage: 'Want to learn more?',
                        })}
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
            </div>
          </div>
        )}
      </StreamsAppPageTemplate.Body>
    </>
  );
}
