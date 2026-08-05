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
  EuiSpacer,
  EuiText,
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
      {steps.map((step) => (
        <FederatedIdentityManualSetupStepAccordion
          key={step.id}
          step={step}
          testSubjPrefix={testSubjPrefix}
        />
      ))}
    </>
  );
}

function FederatedIdentityManualSetupStepAccordion({
  step,
  testSubjPrefix,
}: {
  step: FederatedIdentityManualSetupStep;
  testSubjPrefix: string;
}) {
  const accordionId = useGeneratedHtmlId({ prefix: `${testSubjPrefix}ManualStep-${step.id}` });

  return (
    <>
      <EuiAccordion
        id={accordionId}
        buttonContent={
          <EuiText size="s">
            <strong>
              {i18n.translate('xpack.dataFederation.createFlyout.federated.manual.stepTitle', {
                defaultMessage: 'Step {stepNumber}: {title}',
                values: { stepNumber: step.stepNumber, title: step.title },
              })}
            </strong>
          </EuiText>
        }
        initialIsOpen={step.initialIsOpen ?? step.stepNumber === 1}
        paddingSize="m"
        data-test-subj={`${testSubjPrefix}ManualStep-${step.id}`}
      >
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
      </EuiAccordion>
      <EuiSpacer size="s" />
    </>
  );
}
