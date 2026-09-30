/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { ReactNode } from 'react';
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
interface ManualSetupLineNumbers {
  highlight: string;
  annotations: Record<number, string>;
}
const CODE_BLOCK_MAX_HEIGHT = 180;

export interface FederatedIdentityManualSetupStep {
  id: string;
  title: string;
  description: string;
  command: string;
  lineNumbers: ManualSetupLineNumbers;
}

const SHOW_COMMAND_LABEL = i18n.translate(
  'xpack.dataFederation.createFlyout.federated.manual.showCommand',
  { defaultMessage: 'Show command' }
);

const HIDE_COMMAND_LABEL = i18n.translate(
  'xpack.dataFederation.createFlyout.federated.manual.hideCommand',
  { defaultMessage: 'Hide command' }
);

const annotationsWithWidthLimit = (
  annotations: ManualSetupLineNumbers['annotations'],
  maxInlineSize: number
): Record<number, ReactNode> =>
  Object.fromEntries(
    Object.entries(annotations).map(([line, annotation]) => [
      line,
      <EuiText size="s" css={{ maxInlineSize }}>
        {annotation}
      </EuiText>,
    ])
  );

function ManualSetupStep({
  step,
  stepNumber,
  isLastStep,
  testSubjPrefix,
  isCommandOpen,
  onCommandToggle,
}: {
  step: FederatedIdentityManualSetupStep;
  stepNumber: number;
  isLastStep: boolean;
  testSubjPrefix: string;
  isCommandOpen: boolean;
  onCommandToggle: (isOpen: boolean) => void;
}) {
  const accordionId = useGeneratedHtmlId({
    prefix: `${testSubjPrefix}ManualStepCommand-${step.id}`,
  });
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup
      gutterSize="m"
      alignItems="stretch"
      responsive={false}
      data-test-subj={`${testSubjPrefix}ManualStep-${step.id}`}
    >
      <EuiFlexItem grow={false} aria-hidden={true}>
        <EuiFlexGroup direction="column" gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiStepNumber number={stepNumber} status="incomplete" titleSize="xs" />
          </EuiFlexItem>
          {!isLastStep && (
            <EuiFlexItem
              css={{
                inlineSize: euiTheme.border.width.thick,
                backgroundColor: euiTheme.border.color,
              }}
            />
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
      {/* Without a zero min size the code block widens the row instead of scrolling. */}
      <EuiFlexItem css={{ minInlineSize: 0 }}>
        <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h4>
                <EuiScreenReaderOnly>
                  <span>
                    {i18n.translate(
                      'xpack.dataFederation.createFlyout.federated.manual.stepLabel',
                      {
                        defaultMessage: 'Step {stepNumber}:',
                        values: { stepNumber },
                      }
                    )}{' '}
                  </span>
                </EuiScreenReaderOnly>
                {step.title}
              </h4>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              <p>{step.description}</p>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiAccordion
              id={accordionId}
              buttonContent={
                <EuiText size="s" color="primary">
                  {isCommandOpen ? HIDE_COMMAND_LABEL : SHOW_COMMAND_LABEL}
                </EuiText>
              }
              arrowDisplay="right"
              buttonProps={{
                css: { inlineSize: 'auto', flexGrow: 0 },
                'data-test-subj': `${testSubjPrefix}ManualStepCommandToggle-${step.id}`,
              }}
              forceState={isCommandOpen ? 'open' : 'closed'}
              onToggle={onCommandToggle}
              paddingSize="none"
            >
              <EuiSpacer size="s" />
              <EuiCodeBlock
                language="shell"
                isCopyable
                overflowHeight={CODE_BLOCK_MAX_HEIGHT}
                lineNumbers={{
                  highlight: step.lineNumbers.highlight,
                  annotations: annotationsWithWidthLimit(
                    step.lineNumbers.annotations,
                    euiTheme.base * 16
                  ),
                }}
                data-test-subj={`${testSubjPrefix}ManualStepCommand-${step.id}`}
              >
                {step.command}
              </EuiCodeBlock>
            </EuiAccordion>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

export function FederatedIdentityManualSetup({
  intro,
  steps,
  testSubjPrefix,
}: {
  intro: string;
  steps: FederatedIdentityManualSetupStep[];
  testSubjPrefix: string;
}) {
  const [openStepId, setOpenStepId] = useState<string>();

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="m"
      responsive={false}
      data-test-subj={`${testSubjPrefix}ManualSteps`}
    >
      <EuiFlexItem grow={false}>
        <EuiText size="s" color="subdued">
          {intro}
        </EuiText>
      </EuiFlexItem>
      {steps.map((step, index) => (
        <EuiFlexItem grow={false} key={step.id}>
          <ManualSetupStep
            step={step}
            stepNumber={index + 1}
            isLastStep={index === steps.length - 1}
            testSubjPrefix={testSubjPrefix}
            isCommandOpen={openStepId === step.id}
            onCommandToggle={(isOpen) => setOpenStepId(isOpen ? step.id : undefined)}
          />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}
