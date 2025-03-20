/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreStart, CoreSetup } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { EuiText } from '@elastic/eui';
import { NPSScoreInput } from './components';
import { PromptTelemetry } from './telemetry';
import { TRIGGER_API_ENDPOINT } from '../../../common/constants';

type ProductInterceptPrompterSetupDeps = Pick<CoreSetup, 'analytics'>;
type ProductInterceptPrompterStartDeps = Pick<
  CoreStart,
  'http' | 'notifications' | 'userProfile' | 'analytics'
>;

export class ProductInterceptPrompter {
  private readonly telemetry = new PromptTelemetry();

  setup({ analytics }: ProductInterceptPrompterSetupDeps) {
    return this.telemetry.setup({ analytics });
  }

  start({ http, notifications, userProfile, analytics }: ProductInterceptPrompterStartDeps) {
    const eventReporter = this.telemetry.start({ analytics });

    http
      .get<{ triggerIntervalInMs: number; runs: number }>(TRIGGER_API_ENDPOINT)
      .then((response) => {
        if (typeof response.runs !== 'undefined') {
          let runCount = 0;

          return userProfile.getCurrent().then((profileData) => {
            // Ideally we should check if the user feedback prompt was engaged with at the last feedback
            // the approach will be to check if on user profile the trigger run counts matches the user's profile,
            // in the eventuality that it does, we trigger a feedback session and bump the user's profile run count.
            // with the approach the user will only be prompted once per cycle and per device.

            setInterval(() => {
              const interceptId = response.runs + runCount;

              notifications.intercepts.add({
                title: 'kibana_product_intercept',
                steps: [
                  {
                    id: 'start',
                    title: i18n.translate('productIntercept.prompter.step.start.title', {
                      defaultMessage: 'Help us improve Kibana ({interceptId})',
                      values: { interceptId: String(interceptId) },
                    }),
                    content: () =>
                      React.createElement(
                        EuiText,
                        {},
                        i18n.translate('productIntercept.prompter.step.start.content', {
                          defaultMessage:
                            'We are always looking for ways to improve Kibana. Please take a moment to share your feedback with us.',
                        })
                      ),
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
                onProgress(stepId, stepResponse) {
                  eventReporter.reportInterceptInteractionProgress({
                    interceptId,
                    metricId: stepId,
                    value: Number(stepResponse),
                  });
                },
                onFinish({ response: feedbackResponse }) {
                  // maybe bump user profile run count
                  userProfile.update({});

                  eventReporter.reportInterceptInteraction({
                    interactionType: 'completion',
                    interceptId,
                  });
                },
                onDismiss() {
                  // still update user profile run count, a dismissal is still an interaction
                  eventReporter.reportInterceptInteraction({
                    interactionType: 'dismissal',
                    interceptId,
                  });
                },
              });

              runCount++;
            }, response.triggerIntervalInMs);
          });
        }

        return;
      })
      .catch((error) => {
        // log error
      });
  }
}
