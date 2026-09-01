/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiAccordion,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiScreenReaderOnly,
  EuiSpacer,
  EuiStepNumber,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';

const CODE_BLOCK_VISIBLE_LINES = 10;
/** Row height EUI gives a small code block, which these steps use. */
const CODE_BLOCK_LINE_HEIGHT = 18;

export interface FederatedIdentityManualSetupStep {
  id: string;
  stepNumber: number;
  title: string;
  description?: React.ReactNode;
  command: string;
  language?: 'shell' | 'bash';
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
        <FederatedIdentityManualSetupStepRow
          key={step.id}
          step={step}
          testSubjPrefix={testSubjPrefix}
          isLastStep={index === steps.length - 1}
        />
      ))}
    </>
  );
}

const showCommandLabel = () =>
  i18n.translate('xpack.dataFederation.createFlyout.federated.manual.showCommand', {
    defaultMessage: 'Show command',
  });

const hideCommandLabel = () =>
  i18n.translate('xpack.dataFederation.createFlyout.federated.manual.hideCommand', {
    defaultMessage: 'Hide command',
  });

const CommandToggleLabel = ({ isOpen }: { isOpen: boolean }) => (
  <EuiFlexGroup responsive={false} alignItems="center" gutterSize="xs">
    <EuiFlexItem grow={false}>
      <EuiText size="s" color="primary">
        {isOpen ? hideCommandLabel() : showCommandLabel()}
      </EuiText>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiIcon
        type={isOpen ? 'arrowUp' : 'arrowDown'}
        size="s"
        color="primary"
        aria-hidden={true}
      />
    </EuiFlexItem>
  </EuiFlexGroup>
);

function FederatedIdentityManualSetupStepRow({
  step,
  testSubjPrefix,
  isLastStep,
}: {
  step: FederatedIdentityManualSetupStep;
  testSubjPrefix: string;
  isLastStep: boolean;
}) {
  const commandAccordionId = useGeneratedHtmlId({
    prefix: `${testSubjPrefix}ManualStepCommand-${step.id}`,
  });
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const { euiTheme } = useEuiTheme();
  /**
   * Long commands scroll instead of pushing the following steps out of view.
   * Capping the block ourselves keeps EUI from offering a full screen view,
   * which these commands do not need.
   */
  const codeBlockMaxHeight = CODE_BLOCK_VISIBLE_LINES * CODE_BLOCK_LINE_HEIGHT;

  return (
    <EuiFlexGroup
      gutterSize="m"
      alignItems="stretch"
      responsive={false}
      data-test-subj={`${testSubjPrefix}ManualStep-${step.id}`}
    >
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
        <EuiTitle size="xs">
          <h4>
            <EuiScreenReaderOnly>
              <span>
                {i18n.translate('xpack.dataFederation.createFlyout.federated.manual.stepLabel', {
                  defaultMessage: 'Step {stepNumber}:',
                  values: { stepNumber: step.stepNumber },
                })}{' '}
              </span>
            </EuiScreenReaderOnly>
            {step.title}
          </h4>
        </EuiTitle>
        {step.description ? (
          <>
            <EuiSpacer size="s" />
            <EuiText size="s" color="subdued">
              {step.description}
            </EuiText>
          </>
        ) : null}
        <EuiSpacer size="s" />
        <EuiAccordion
          id={commandAccordionId}
          arrowDisplay="none"
          buttonContent={<CommandToggleLabel isOpen={isCommandOpen} />}
          onToggle={setIsCommandOpen}
          paddingSize="none"
          data-test-subj={`${testSubjPrefix}ManualStepCommandToggle-${step.id}`}
        >
          <EuiSpacer size="s" />
          <EuiCodeBlock
            language={step.language ?? 'shell'}
            isCopyable
            lineNumbers={step.lineNumbers ?? true}
            css={{ '.euiCodeBlock__pre': { maxBlockSize: codeBlockMaxHeight } }}
            data-test-subj={`${testSubjPrefix}ManualStepCommand-${step.id}`}
          >
            {step.command}
          </EuiCodeBlock>
        </EuiAccordion>
        {!isLastStep ? <EuiSpacer size="m" /> : null}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
