/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiImage,
  EuiLink,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import enterpriseGatingModalIllustration from './enterprise_gating_modal.svg';
import { enterpriseGatingModalStrings, getPrimaryActionLabel } from './strings';

export type EnterpriseGatingModalEnvironment = 'cloud' | 'selfManaged';
export type EnterpriseGatingModalTrialStatus = 'notStarted' | 'expired';
export type EnterpriseGatingModalPrimaryAction = 'startTrial' | 'upgrade' | 'contactUs';

export interface EnterpriseGatingModalProps {
  environment: EnterpriseGatingModalEnvironment;
  isOpen?: boolean;
  trialStatus?: EnterpriseGatingModalTrialStatus;
  hasManageSubscriptionPermission?: boolean;
  subscriptionFeaturesUrl: string;
  /**
   * Called when the primary action button is clicked. Receives the resolved
   * action type so the consumer can navigate, track analytics, or open a modal.
   * When omitted, the primary action button is not rendered.
   */
  onPrimaryAction?: (action: EnterpriseGatingModalPrimaryAction) => void;
  onCancel: () => void;
  'data-test-subj'?: string;
}

interface GetPrimaryActionArgs {
  environment: EnterpriseGatingModalEnvironment;
  hasManageSubscriptionPermission: boolean;
  trialStatus: EnterpriseGatingModalTrialStatus;
}

const getPrimaryAction = ({
  environment,
  hasManageSubscriptionPermission,
  trialStatus,
}: GetPrimaryActionArgs): EnterpriseGatingModalPrimaryAction | undefined => {
  if (environment === 'selfManaged') {
    return 'contactUs';
  }

  if (!hasManageSubscriptionPermission) {
    return undefined;
  }

  return trialStatus === 'expired' ? 'upgrade' : 'startTrial';
};

export const EnterpriseGatingModal = ({
  environment,
  isOpen = true,
  trialStatus = 'notStarted',
  hasManageSubscriptionPermission = false,
  subscriptionFeaturesUrl,
  onPrimaryAction,
  onCancel,
  'data-test-subj': dataTestSubj = 'enterpriseGatingModal',
}: EnterpriseGatingModalProps) => {
  const modalTitleId = useGeneratedHtmlId({ prefix: 'enterpriseGatingModalTitle' });
  const { euiTheme } = useEuiTheme();

  const primaryAction = getPrimaryAction({
    environment,
    hasManageSubscriptionPermission,
    trialStatus,
  });

  if (!isOpen) {
    return null;
  }

  return (
    <EuiModal
      data-test-subj={dataTestSubj}
      onClose={onCancel}
      aria-labelledby={modalTitleId}
      maxWidth={euiTheme.breakpoint.m}
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId} data-test-subj={`${dataTestSubj}Title`}>
          {enterpriseGatingModalStrings.title}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiFlexGroup alignItems="center" gutterSize="xl">
          <EuiFlexItem>
            <EuiFlexGroup direction="column" gutterSize="l">
              {enterpriseGatingModalStrings.benefits.map(({ id, title, description }) => (
                <EuiFlexItem key={id}>
                  <EuiFlexGroup gutterSize="m" responsive={false}>
                    <EuiFlexItem grow={false}>
                      <EuiIcon
                        type="check"
                        color="success"
                        aria-hidden={true}
                        data-test-subj={`${dataTestSubj}BenefitIcon`}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiText size="s">
                        <strong>{title}</strong> {description}
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiImage
              src={enterpriseGatingModalIllustration}
              alt=""
              size="original"
              hasShadow={false}
              data-test-subj={`${dataTestSubj}Illustration`}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj={`${dataTestSubj}CancelButton`}
              flush="left"
              onClick={onCancel}
            >
              {enterpriseGatingModalStrings.cancelButtonLabel}
            </EuiButtonEmpty>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiLink
                  data-test-subj={`${dataTestSubj}ReviewSubscriptionFeaturesButton`}
                  href={subscriptionFeaturesUrl}
                  target="_blank"
                >
                  {enterpriseGatingModalStrings.reviewSubscriptionFeaturesButtonLabel}
                </EuiLink>
              </EuiFlexItem>

              {primaryAction && onPrimaryAction && (
                <EuiFlexItem grow={false}>
                  <EuiButton
                    data-test-subj={`${dataTestSubj}PrimaryActionButton`}
                    fill
                    onClick={() => onPrimaryAction(primaryAction)}
                  >
                    {getPrimaryActionLabel(primaryAction)}
                  </EuiButton>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
};
