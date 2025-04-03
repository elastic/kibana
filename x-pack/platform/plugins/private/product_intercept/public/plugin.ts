/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subscription } from 'rxjs';
import React from 'react';
import { css, Global } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { EuiText } from '@elastic/eui';
import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { InterceptsStart } from '@kbn/intercepts-plugin/public';

import { NPSScoreInput } from './components';
import { PromptTelemetry } from './telemetry';
import { TRIGGER_DEF_ID } from '../common/constants';

interface ProductInterceptPluginStartDeps {
  intercepts: InterceptsStart;
}

export class ProductInterceptPublicPlugin implements Plugin {
  private readonly telemetry = new PromptTelemetry();
  private interceptSubscription?: Subscription;

  setup(core: CoreSetup) {
    return this.telemetry.setup({ analytics: core.analytics });
  }

  start(core: CoreStart, { intercepts }: ProductInterceptPluginStartDeps) {
    const eventReporter = this.telemetry.start({
      analytics: core.analytics,
    });

    const staticAssetsHelper = core.http.staticAssets;

    this.interceptSubscription = intercepts
      .registerIntercept?.({
        id: TRIGGER_DEF_ID,
        steps: [
          {
            id: 'start',
            title: i18n.translate('productIntercept.prompter.step.start.title', {
              defaultMessage: 'Help us improve Kibana',
            }),
            content: () =>
              React.createElement(React.Fragment, {}, [
                React.createElement(
                  Global,
                  {
                    key: 'productInterceptPrompterGlobalStyles',
                    styles: css`
                      :root {
                        // hooks into exposed CSS variable to set background image the intercept
                        --intercept-background: url(${staticAssetsHelper?.getPluginAssetHref(
                            'magnifying_glass_search.png'
                          )})
                          no-repeat right;
                      }
                    `,
                  },
                  null
                ),
                React.createElement(
                  EuiText,
                  { key: 'productInterceptPrompterStartContent' },
                  i18n.translate('productIntercept.prompter.step.start.content', {
                    defaultMessage:
                      'We are always looking for ways to improve Kibana. Please take a moment to share your feedback with us.',
                  })
                ),
              ]),
          },
          {
            id: 'satisfaction',
            title: i18n.translate('productIntercept.prompter.step.satisfaction.title', {
              defaultMessage: 'Overall, how satisfied or dissatisfied are you with Kibana?',
            }),
            content: ({ onValue }) => {
              return React.createElement(NPSScoreInput, {
                lowerBoundHelpText: i18n.translate(
                  'productIntercept.prompter.step.satisfaction.lowerBoundDescriptionText',
                  {
                    defaultMessage: 'Very dissatisfied',
                  }
                ),
                upperBoundHelpText: i18n.translate(
                  'productIntercept.prompter.step.satisfaction.upperBoundDescriptionText',
                  {
                    defaultMessage: 'Very satisfied',
                  }
                ),
                onChange: onValue,
              });
            },
          },
          {
            id: 'ease',
            title: i18n.translate('productIntercept.prompter.step.ease.title', {
              defaultMessage: 'Overall, how difficult or easy is it to use Kibana?',
            }),
            content: ({ onValue }) => {
              return React.createElement(NPSScoreInput, {
                lowerBoundHelpText: i18n.translate(
                  'productIntercept.prompter.step.ease.lowerBoundDescriptionText',
                  {
                    defaultMessage: 'Very difficult',
                  }
                ),
                upperBoundHelpText: i18n.translate(
                  'productIntercept.prompter.step.ease.upperBoundDescriptionText',
                  {
                    defaultMessage: 'Very easy',
                  }
                ),
                onChange: onValue,
              });
            },
          },
          {
            id: 'completion',
            title: i18n.translate('productIntercept.prompter.step.completion.title', {
              defaultMessage: 'Thanks for the feedback!',
            }),
            content: () => {
              return React.createElement(
                EuiText,
                {},
                i18n.translate('productIntercept.prompter.step.completion.content', {
                  defaultMessage:
                    "If you'd like to participate in future research to help improve kibana, click here",
                })
              );
            },
          },
        ],
        onProgress: ({ stepId, stepResponse, runId }) => {
          eventReporter.reportInterceptInteractionProgress({
            interceptRunId: runId,
            metricId: stepId,
            value: Number(stepResponse),
          });
        },
        onFinish: ({ response: feedbackResponse, runId }) => {
          eventReporter.reportInterceptInteraction({
            interactionType: 'completion',
            interceptRunId: runId,
          });
        },
        onDismiss: ({ runId }) => {
          // still update user profile run count, a dismissal is still an interaction
          eventReporter.reportInterceptInteraction({
            interactionType: 'dismissal',
            interceptRunId: runId,
          });
        },
      })
      .subscribe();

    return {};
  }

  stop() {
    this.interceptSubscription?.unsubscribe();
  }
}
