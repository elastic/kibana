/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subscription } from 'rxjs';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiLink, EuiText } from '@elastic/eui';
import { type CoreSetup, type CoreStart, Plugin } from '@kbn/core/public';
import type { PluginInitializerContext } from '@kbn/core/public';
import { InterceptsStart } from '@kbn/intercepts-plugin/public';
import { type CloudStart } from '@kbn/cloud-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';

import { NPSScoreInput } from './components';
import { PromptTelemetry } from './telemetry';
import { TRIGGER_DEF_ID, UPGRADE_TRIGGER_DEF_PREFIX_ID } from '../common/constants';

interface ProductInterceptPluginStartDeps {
  intercepts: InterceptsStart;
  cloud: CloudStart;
}

export class ProductInterceptPublicPlugin implements Plugin {
  private readonly telemetry = new PromptTelemetry();
  private interceptSubscription?: Subscription;
  private upgradeInterceptSubscription?: Subscription;
  private readonly buildVersion: string;

  constructor(ctx: PluginInitializerContext) {
    this.buildVersion = ctx.env.packageInfo.version;
  }

  setup(core: CoreSetup) {
    return this.telemetry.setup({ analytics: core.analytics });
  }

  start(core: CoreStart, { intercepts, cloud }: ProductInterceptPluginStartDeps) {
    const eventReporter = this.telemetry.start({
      analytics: core.analytics,
    });

    const productOffering = `Elastic ${function (string: string) {
      return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
    }.call(null, cloud.serverless?.projectType || '')}`.trim();

    void (async () => {
      const currentUser = await core.security.authc.getCurrentUser();

      const surveyUrl = new URL('https://ela.st/kibana-product-survey');

      surveyUrl.searchParams.set('uid', String(currentUser.profile_uid || null));
      surveyUrl.searchParams.set('pid', String(cloud.serverless.projectId || null));
      surveyUrl.searchParams.set('solution', String(cloud.serverless.projectType || null));

      [this.upgradeInterceptSubscription, this.interceptSubscription] = [
        TRIGGER_DEF_ID,
        `${UPGRADE_TRIGGER_DEF_PREFIX_ID}:${this.buildVersion}`,
      ].map((triggerId) =>
        intercepts
          .registerIntercept?.({
            id: triggerId,
            steps: [
              {
                id: 'start',
                title: i18n.translate('productIntercept.prompter.step.start.title', {
                  defaultMessage: 'Help us improve {productOffering}',
                  values: {
                    productOffering,
                  },
                }),
                content: () =>
                  React.createElement(
                    EuiText,
                    { key: 'productInterceptPrompterStartContent', size: 's' },
                    i18n.translate('productIntercept.prompter.step.start.content', {
                      defaultMessage:
                        'We are always looking for ways to improve {productOffering}. Please take a moment to share your feedback with us.',
                      values: {
                        productOffering,
                      },
                    })
                  ),
              },
              {
                id: 'satisfaction',
                title: i18n.translate('productIntercept.prompter.step.satisfaction.title', {
                  defaultMessage:
                    'Overall, how satisfied or dissatisfied are you with {productOffering}?',
                  values: {
                    productOffering,
                  },
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
                  defaultMessage: 'Overall, how difficult or easy is it to use {productOffering}?',
                  values: {
                    productOffering,
                  },
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
                    { size: 's' },
                    React.createElement(FormattedMessage, {
                      id: 'productIntercept.prompter.step.completion.content',
                      defaultMessage:
                        "If you'd like to participate in future research to help improve {productOffering}, <link>click here</link>.",
                      values: {
                        productOffering,
                        link: (chunks) =>
                          React.createElement(
                            EuiLink,
                            {
                              external: true,
                              href: surveyUrl.toString(),
                              target: '_blank',
                            },
                            chunks
                          ),
                      },
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
          .subscribe()
      );
    })();

    return {};
  }

  stop() {
    this.interceptSubscription?.unsubscribe();
    this.upgradeInterceptSubscription?.unsubscribe();
  }
}
