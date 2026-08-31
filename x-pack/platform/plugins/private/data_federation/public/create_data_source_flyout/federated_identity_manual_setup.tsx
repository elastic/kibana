/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiAccordion,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiScreenReaderOnly,
  EuiSpacer,
  EuiStepNumber,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';

export interface FederatedIdentityManualSetupStep {
  id: string;
  stepNumber: number;
  title: string;
  description?: React.ReactNode;
  command: string;
  language?: 'shell' | 'bash';
  initialIsOpen?: boolean;
  lineNumbers?: {
    highlight: string;
    annotations: Record<number, string>;
  };
}

export function FederatedIdentityManualSetup({
  intro,
  steps,
  testSubjPrefix,
}: {
  intro: React.ReactNode;
  steps: FederatedIdentityManualSetupStep[];
  testSubjPrefix: string;
}) {
  return (
    <>
      <EuiText size="s" color="subdued">
        {intro}
      </EuiText>
      <EuiSpacer size="m" />
      {steps.map((step, index) => (
        <FederatedIdentityManualSetupStepAccordion
          key={step.id}
          step={step}
          testSubjPrefix={testSubjPrefix}
          isLastStep={index === steps.length - 1}
        />
      ))}
    </>
  );
}

function FederatedIdentityManualSetupStepAccordion({
  step,
  testSubjPrefix,
  isLastStep,
}: {
  step: FederatedIdentityManualSetupStep;
  testSubjPrefix: string;
  isLastStep: boolean;
}) {
  const accordionId = useGeneratedHtmlId({ prefix: `${testSubjPrefix}ManualStep-${step.id}` });
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup gutterSize="m" alignItems="stretch" responsive={false}>
      <EuiFlexItem grow={false} aria-hidden={true}>
        <EuiFlexGroup
          direction="column"
          gutterSize="xs"
          alignItems="center"
          responsive={false}
          css={{ blockSize: '100%' }}
        >
          <EuiFlexItem grow={false}>
            <EuiStepNumber number={step.stepNumber} status="incomplete" titleSize="xs" />
          </EuiFlexItem>
          {!isLastStep ? (
            <EuiFlexItem
              css={{
                inlineSize: euiTheme.border.width.thick,
                backgroundColor: euiTheme.border.color,
              }}
            />
          ) : null}
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiAccordion
          id={accordionId}
          buttonContent={
            <EuiTitle size="xs">
              <h4>
                <EuiScreenReaderOnly>
                  <span>
                    {i18n.translate(
                      'xpack.dataFederation.createFlyout.federated.manual.stepLabel',
                      {
                        defaultMessage: 'Step {stepNumber}:',
                        values: { stepNumber: step.stepNumber },
                      }
                    )}{' '}
                  </span>
                </EuiScreenReaderOnly>
                {step.title}
              </h4>
            </EuiTitle>
          }
          initialIsOpen={step.initialIsOpen ?? step.stepNumber === 1}
          paddingSize="none"
          data-test-subj={`${testSubjPrefix}ManualStep-${step.id}`}
        >
          {/* Clears the accordion arrow so the content lines up with the step title. */}
          <div
            css={{
              paddingInlineStart: `calc(${euiTheme.size.l} + ${euiTheme.size.xs})`,
            }}
          >
            <EuiSpacer size="s" />
            {step.description ? (
              <>
                <EuiText size="s" color="subdued">
                  {step.description}
                </EuiText>
                <EuiSpacer size="s" />
              </>
            ) : null}
            <EuiCodeBlock
              language={step.language ?? 'shell'}
              isCopyable
              lineNumbers={step.lineNumbers}
              data-test-subj={`${testSubjPrefix}ManualStepCommand-${step.id}`}
            >
              {step.command}
            </EuiCodeBlock>
          </div>
        </EuiAccordion>
        {!isLastStep ? <EuiSpacer size="m" /> : null}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
