/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiLink, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { Intercept } from '@kbn/intercepts-plugin/public';
import type { PromptTelemetry } from './telemetry';
import { NPSScoreInput } from './components';

interface ProductInterceptRegistrationHandlerParams {
  productOffering: string;
  surveyUrl: URL;
  eventReporter: ReturnType<PromptTelemetry['start']>;
}

/**
 * @description Returns the registration configuration for the product intercept.
 * This configuration defines the steps and content of the intercept
 * that prompts users for feedback on their experience with the product.
 */
export const productInterceptRegistrationConfig = ({
  eventReporter,
  surveyUrl,
  productOffering,
}: ProductInterceptRegistrationHandlerParams): Omit<Intercept, 'id'> => {
  return {
    steps: [
      {
        id: 'start',
        title: i18n.translate('productIntercept.prompter.step.start.title', {
          defaultMessage: 'Help us improve {productOffering}',
          values: {
            productOffering,
          },
        }),
        content: () => (
          <EuiText size="s" key="productInterceptPrompterStartContent">
            <FormattedMessage
              id="productIntercept.prompter.step.start.content"
              defaultMessage="We are always looking for ways to improve {productOffering}. Please take a moment to share your feedback with us."
              values={{ productOffering }}
            />
          </EuiText>
        ),
      },
      {
        id: 'satisfaction',
        title: i18n.translate('productIntercept.prompter.step.satisfaction.title', {
          defaultMessage: 'Overall, how satisfied or dissatisfied are you with {productOffering}?',
          values: {
            productOffering,
          },
        }),
        content: ({ onValue }) => {
          return (
            <NPSScoreInput
              lowerBoundHelpText={i18n.translate(
                'productIntercept.prompter.step.satisfaction.lowerBoundDescriptionText',
                {
                  defaultMessage: 'Very dissatisfied',
                }
              )}
              upperBoundHelpText={i18n.translate(
                'productIntercept.prompter.step.satisfaction.upperBoundDescriptionText',
                {
                  defaultMessage: 'Very satisfied',
                }
              )}
              onChange={onValue}
            />
          );
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
          return (
            <NPSScoreInput
              lowerBoundHelpText={i18n.translate(
                'productIntercept.prompter.step.ease.lowerBoundDescriptionText',
                {
                  defaultMessage: 'Very difficult',
                }
              )}
              upperBoundHelpText={i18n.translate(
                'productIntercept.prompter.step.ease.upperBoundDescriptionText',
                {
                  defaultMessage: 'Very easy',
                }
              )}
              onChange={onValue}
            />
          );
        },
      },
      {
        id: 'completion',
        title: i18n.translate('productIntercept.prompter.step.completion.title', {
          defaultMessage: 'Thanks for the feedback!',
        }),
        content: () => {
          return (
            <EuiText size="s" key="productInterceptPrompterCompletionContent">
              <FormattedMessage
                id="productIntercept.prompter.step.completion.content"
                defaultMessage="If you'd like to participate in future research to help improve {productOffering}, <link>click here</link>."
                values={{
                  productOffering,
                  link: (chunks) => (
                    <EuiLink external target="_blank" href={surveyUrl.toString()}>
                      {chunks}
                    </EuiLink>
                  ),
                }}
              />
            </EuiText>
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
  };
};
