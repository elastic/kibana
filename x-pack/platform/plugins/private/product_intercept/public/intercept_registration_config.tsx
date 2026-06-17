/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { Intercept } from '@kbn/intercepts-plugin/public';
import type { PromptTelemetry } from './telemetry';
import { NPSScoreInput } from './components';

interface ProductInterceptRegistrationHandlerParams {
  productOffering: string;
  eventReporter: ReturnType<PromptTelemetry['start']>;
}

/**
 * @description Returns the registration configuration for the product intercept.
 * This configuration defines the steps and content of the intercept
 * that prompts users for feedback on their experience with the product.
 */
export const productInterceptRegistrationConfig = ({
  eventReporter,
  productOffering,
}: ProductInterceptRegistrationHandlerParams): Omit<Intercept, 'id'> => {
  const startInterceptStep = {
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
  } satisfies Extract<Intercept['steps'][number], { id: 'start' }>;

  const satisfactionInterceptStep = {
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
  } satisfies Exclude<Intercept['steps'][number], { id: 'start' } | { id: 'completion' }>;

  const easeInterceptStep = {
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
  } satisfies Exclude<Intercept['steps'][number], { id: 'start' } | { id: 'completion' }>;

  const completionInterceptStep = {
    id: 'completion',
    title: (
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="checkInCircleFilled" color="success" size="m" aria-hidden />
        </EuiFlexItem>
        <EuiFlexItem>
          <FormattedMessage
            id="productIntercept.prompter.step.completion.title"
            defaultMessage="Thanks for the feedback!"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    content: ({
      onValue,
    }: {
      onValue: (v: unknown) => void;
      responseMap: Record<string, unknown>;
    }) => (
      <EuiFlexGroup gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="empty" size="m" aria-hidden />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiFlexItem>
              <EuiText size="s">
                <FormattedMessage
                  id="productIntercept.prompter.step.completion.body"
                  defaultMessage="Want to help shape the future of Elastic? Sign up to join our research panel!"
                />
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFlexGroup gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    color="success"
                    iconType="popout"
                    iconSide="right"
                    href="https://ela.st/user-interviews-opt-in"
                    target="_blank"
                    data-test-subj="productInterceptSurveyLink"
                  >
                    <FormattedMessage
                      id="productIntercept.prompter.step.completion.participateButton"
                      defaultMessage="Participate"
                    />
                  </EuiButton>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty color="success" onClick={() => onValue(null)}>
                    <FormattedMessage
                      id="productIntercept.prompter.step.completion.maybeLaterButton"
                      defaultMessage="Maybe later"
                    />
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
  } satisfies Extract<Intercept['steps'][number], { id: 'completion' }>;

  return {
    steps: [
      startInterceptStep,
      satisfactionInterceptStep,
      easeInterceptStep,
      completionInterceptStep,
    ],
    onProgress: ({ stepId, stepResponse, runId, interceptId }) => {
      eventReporter.reportInterceptInteractionProgress({
        interceptRunId: runId,
        interceptId,
        metricId: stepId,
        value: Number(stepResponse),
      });
    },
    onFinish: ({ runId, interceptId }) => {
      eventReporter.reportInterceptInteractionTermination({
        interactionType: 'completion',
        interceptRunId: runId,
        interceptId,
      });
    },
    onDismiss: ({ runId, interceptId }) => {
      // still update user profile run count, a dismissal is still an interaction
      eventReporter.reportInterceptInteractionTermination({
        interactionType: 'dismissal',
        interceptRunId: runId,
        interceptId,
      });
    },
  };
};
