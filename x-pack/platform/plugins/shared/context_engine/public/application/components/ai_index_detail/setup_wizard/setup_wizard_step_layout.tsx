/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import type { ReactNode } from 'react';
import React from 'react';
import { CONTEXT_ENGINE_UI_EBT } from '../../../../../common/telemetry';
import { useKibana } from '../../../hooks/use_kibana';
import type { SetupWizardStepLayoutControls } from './types';

// Parts of the one bordered panel: no own border, shadow or rounded corners.
const innerPanelProps = {
  color: 'transparent',
  hasBorder: false,
  hasShadow: false,
  borderRadius: 'none',
} as const;

const ebtElement = CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageSetupWizard;
const ebtAction = CONTEXT_ENGINE_UI_EBT.action.setupWizard;

const optionalLabel = i18n.translate('xpack.contextEngine.setupWizard.optional', {
  defaultMessage: 'Optional',
});

const exitLabel = i18n.translate('xpack.contextEngine.setupWizard.exit', {
  defaultMessage: 'Exit setup',
});

const backLabel = i18n.translate('xpack.contextEngine.setupWizard.back', {
  defaultMessage: 'Back',
});

const skipLabel = i18n.translate('xpack.contextEngine.setupWizard.skip', {
  defaultMessage: 'Skip',
});

const skipAndFinishLabel = i18n.translate('xpack.contextEngine.setupWizard.skipAndFinish', {
  defaultMessage: 'Skip and finish',
});

const continueLabel = i18n.translate('xpack.contextEngine.setupWizard.continue', {
  defaultMessage: 'Continue',
});

const finishLabel = i18n.translate('xpack.contextEngine.setupWizard.finish', {
  defaultMessage: 'Finish setup',
});

interface SetupWizardStepLayoutProps extends SetupWizardStepLayoutControls {
  /** Left out: Continue works once the step is done, or right away for an optional step. */
  canContinue?: boolean;
  /** Saves the step's draft on Continue. Resolves false when saving failed. */
  onSave?: () => Promise<boolean>;
  children: ReactNode;
}

/** The frame of every wizard step: heading, docs link, the step's body and the footer buttons. */
export const SetupWizardStepLayout = ({
  step,
  headingRef,
  isDone,
  isFirstStep,
  isLastStep,
  isBusy,
  onBack,
  onSkip,
  onExit,
  onContinue,
  canContinue = isDone || step.isOptional === true,
  onSave,
  children,
}: SetupWizardStepLayoutProps) => {
  const {
    services: { docLinks },
  } = useKibana();
  const { id, texts, isOptional } = step;

  return (
    <EuiPanel hasBorder paddingSize="none" data-test-subj={`contextSetupWizardPanel-${id}`}>
      <EuiPanel {...innerPanelProps} paddingSize="l">
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="s">
              <h2 ref={headingRef} tabIndex={-1}>
                {texts.title}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          {isOptional && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow" data-test-subj="contextSetupWizardOptionalBadge">
                {optionalLabel}
              </EuiBadge>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          <p>
            {texts.description}{' '}
            <EuiLink
              href={step.getDocsLink(docLinks.links.contextEngine)}
              target="_blank"
              external
              {...getEbtProps({
                element: ebtElement,
                action: CONTEXT_ENGINE_UI_EBT.action.navigation.LEARN_MORE_DOCS,
                detail: id,
              })}
            >
              {texts.docsLinkLabel}
            </EuiLink>
          </p>
        </EuiText>
        <EuiSpacer size="l" />
        {children}
      </EuiPanel>
      <EuiHorizontalRule margin="none" />
      <EuiPanel {...innerPanelProps} paddingSize="m">
        <EuiFlexGroup alignItems="center" responsive={false} wrap gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={onExit}
              isDisabled={isBusy}
              data-test-subj="contextSetupWizardExit"
              {...getEbtProps({ element: ebtElement, action: ebtAction.EXIT, detail: id })}
            >
              {exitLabel}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem />
          {!isFirstStep && (
            <EuiFlexItem grow={false}>
              <EuiButton
                onClick={onBack}
                isDisabled={isBusy}
                data-test-subj="contextSetupWizardBack"
                {...getEbtProps({ element: ebtElement, action: ebtAction.BACK, detail: id })}
              >
                {backLabel}
              </EuiButton>
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={onSkip}
              isDisabled={isBusy}
              data-test-subj="contextSetupWizardSkip"
              {...getEbtProps({
                element: ebtElement,
                action: isLastStep ? ebtAction.SKIP_AND_FINISH : ebtAction.SKIP,
                detail: id,
              })}
            >
              {isLastStep ? skipAndFinishLabel : skipLabel}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={() => onContinue(onSave)}
              isDisabled={!canContinue}
              isLoading={isBusy}
              data-test-subj="contextSetupWizardContinue"
              {...getEbtProps({
                element: ebtElement,
                action: isLastStep ? ebtAction.FINISH : ebtAction.CONTINUE,
                detail: id,
              })}
            >
              {isLastStep ? finishLabel : continueLabel}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiPanel>
  );
};
