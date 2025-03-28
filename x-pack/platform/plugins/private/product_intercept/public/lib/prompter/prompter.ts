/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Rx from 'rxjs';
import React from 'react';
import { css, Global } from '@emotion/react';
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

declare module '@kbn/core-user-profile-common' {
  interface UserSettingsData {
    /**
     * The number of times the user has interacted with the kibana product feedback prompt.
     */
    lastInteractedInterceptId?: number;
  }
}

export class ProductInterceptPrompter {
  private readonly telemetry = new PromptTelemetry();
  private userProfileService?: ProductInterceptPrompterStartDeps['userProfile'];
  private userProfileSubscription?: Rx.Subscription;
  private userProfile?: Rx.ObservedValueOf<
    ReturnType<ProductInterceptPrompterStartDeps['userProfile']['getUserProfile$']>
  >;
  private staticAssetsHelper?: CoreStart['http']['staticAssets'];

  setup({ analytics }: ProductInterceptPrompterSetupDeps) {
    return this.telemetry.setup({ analytics });
  }

  start({ http, notifications, userProfile, analytics }: ProductInterceptPrompterStartDeps) {
    const eventReporter = this.telemetry.start({ analytics });

    this.userProfileService = userProfile;
    this.staticAssetsHelper = http.staticAssets;

    http
      .get<{
        triggerIntervalInMs: number;
        registeredAt: ReturnType<Date['toISOString']>;
      }>(TRIGGER_API_ENDPOINT)
      .then((response) => {
        if (typeof response !== 'undefined') {
          const now = Date.now();
          let diff = 0;

          // Calculate the number of runs since the trigger was registered
          const runs = Math.floor(
            (diff = now - Date.parse(response.registeredAt)) / response.triggerIntervalInMs
          );

          // Calculate the time until the next run
          const nextRun = (runs + 1) * response.triggerIntervalInMs - diff;

          let runCount = runs;

          this.userProfileSubscription = Rx.timer(nextRun, response.triggerIntervalInMs)
            .pipe(
              Rx.switchMap(() =>
                Rx.combineLatest([userProfile.getEnabled$(), userProfile.getUserProfile$()])
              ),
              Rx.take(1), // Ensure the timer emits only once
              Rx.repeatWhen(
                (completed) => completed.pipe(Rx.delay(response.triggerIntervalInMs)) // Requeue after the interval
              )
            )
            .subscribe(([enabled, profileData]) => {
              this.userProfile = profileData;

              if (
                enabled &&
                runCount !== (profileData?.userSettings?.lastInteractedInterceptId ?? 0)
              ) {
                this.registerIntercept(runCount, notifications.intercepts, eventReporter);
                runCount++;
              }
            });
        }

        return;
      })
      .catch((error) => {
        // log error
      });
  }

  private async registerIntercept(
    runId: number,
    intercepts: ProductInterceptPrompterStartDeps['notifications']['intercepts'],
    eventReporter: ReturnType<PromptTelemetry['start']>
  ) {
    intercepts.add({
      id: 'kibana_product_intercept',
      steps: [
        {
          id: 'start',
          title: i18n.translate('productIntercept.prompter.step.start.title', {
            defaultMessage: 'Help us improve Kibana ({runId})',
            values: { runId: String(runId) },
          }),
          content: () =>
            React.createElement(React.Fragment, {}, [
              React.createElement(
                Global,
                {
                  key: 'productInterceptPrompterGlobalStyles',
                  styles: css`
                    :root {
                      --intercept-background: url(${this.staticAssetsHelper?.getPluginAssetHref(
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
      onProgress: (stepId, stepResponse) => {
        eventReporter.reportInterceptInteractionProgress({
          interceptId: runId,
          metricId: stepId,
          value: Number(stepResponse),
        });
      },
      onFinish: ({ response: feedbackResponse }) => {
        eventReporter.reportInterceptInteraction({
          interactionType: 'completion',
          interceptId: runId,
        });

        this.persistInterceptInteraction(runId);
      },
      onDismiss: () => {
        // still update user profile run count, a dismissal is still an interaction
        eventReporter.reportInterceptInteraction({
          interactionType: 'dismissal',
          interceptId: runId,
        });

        this.persistInterceptInteraction(runId);
      },
    });
  }

  private async persistInterceptInteraction(runCount: number) {
    const userSettings = this.userProfile!.userSettings || {};

    await this.userProfileService!.partialUpdate({
      userSettings: {
        ...userSettings,
        lastInteractedInterceptId: runCount,
      },
    });
  }

  stop() {
    this.userProfileSubscription?.unsubscribe();
  }
}
