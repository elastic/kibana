/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiSpacer,
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiButton,
} from '../../../../../shared_imports';

import { SECURITY_MODEL } from '../../../../../../common/constants';
import { AppContext } from '../../../../app_context';
import { ActionButtons } from '../components';

const MIN_ALLOWED_VERSION_API_KEYS_METHOD = '8.10';
const CARD_MAX_WIDTH = 400;
const i18nTexts = {
  apiKeyTitle: i18n.translate(
    'xpack.remoteClusters.clusterWizard.trustStep.setupWithApiKeys.title',
    { defaultMessage: 'API keys' }
  ),
  apiKeyDescription: i18n.translate(
    'xpack.remoteClusters.clusterWizard.trustStep.setupWithApiKeys.description',
    {
      defaultMessage:
        'Fine-grained access to remote indices. You need an API key provided by the remote cluster administrator.',
    }
  ),
  certTitle: i18n.translate('xpack.remoteClusters.clusterWizard.trustStep.setupWithCert.title', {
    defaultMessage: 'Certificates',
  }),
  certDescription: i18n.translate(
    'xpack.remoteClusters.clusterWizard.trustStep.setupWithCert.description',
    {
      defaultMessage:
        'Full access to the remote cluster. You need TLS certificates from the remote cluster.',
    }
  ),
};

interface Props {
  next: (model: string) => void;
  onSecurityChange: (model: string) => void;
  onCancel?: () => void;
  currentSecurityModel: string;
}

export const RemoteClusterSetupTrust = ({
  onCancel,
  next,
  currentSecurityModel,
  onSecurityChange,
}: Props) => {
  const { canUseAPIKeyTrustModel } = useContext(AppContext);
  const [securityModel, setSecurityModel] = useState<string>(currentSecurityModel);

  const selectModeButton = (securityModelType: string, testSubj: string) => {
    const isSelected = securityModel === securityModelType;
    const buttonProps = {
      onClick: () => {
        setSecurityModel(securityModelType);
        onSecurityChange(securityModelType);
      },
      fullWidth: true,
      'data-test-subj': testSubj,
    };
    return (
      <EuiButton
        {...buttonProps}
        iconSide={isSelected ? 'left' : undefined}
        iconType={isSelected ? 'check' : undefined}
        color={isSelected ? 'success' : 'text'}
      >
        <FormattedMessage
          id={
            isSelected
              ? 'xpack.remoteClusters.clusterWizard.trustStep.selected'
              : 'xpack.remoteClusters.clusterWizard.trustStep.docs'
          }
          defaultMessage={isSelected ? 'Selected' : 'Select'}
        />
      </EuiButton>
    );
  };

  return (
    <div>
      <EuiText size="m" textAlign="center">
        <p>
          <FormattedMessage
            id="xpack.remoteClusters.clusterWizard.trustStep.title"
            defaultMessage="Set up an authentication mechanism to connect to the remote cluster."
          />
        </p>
      </EuiText>

      <EuiSpacer size="xxl" />

      <EuiFlexGroup wrap justifyContent="center">
        {canUseAPIKeyTrustModel && (
          <EuiFlexItem style={{ maxWidth: CARD_MAX_WIDTH }}>
            <EuiCard
              title={i18nTexts.apiKeyTitle}
              paddingSize="l"
              data-test-subj="setupTrustApiKeyCard"
            >
              <EuiText size="s">
                <p>{i18nTexts.apiKeyDescription}</p>
              </EuiText>
              <EuiSpacer size="xl" />

              {selectModeButton(SECURITY_MODEL.API, 'setupTrustApiKeyMode')}

              <EuiSpacer size="xl" />
              <EuiText size="xs" color="subdued">
                <p>
                  <FormattedMessage
                    id="xpack.remoteClusters.clusterWizard.trustStep.apiKeyNote"
                    defaultMessage="Both clusters must be on version {minAllowedVersion} or above."
                    values={{ minAllowedVersion: MIN_ALLOWED_VERSION_API_KEYS_METHOD }}
                  />
                </p>
              </EuiText>
            </EuiCard>
          </EuiFlexItem>
        )}

        <EuiFlexItem style={{ maxWidth: CARD_MAX_WIDTH }}>
          <EuiCard
            title={
              <>
                <EuiSpacer size="s" />
                {i18nTexts.certTitle}
              </>
            }
            paddingSize="l"
            data-test-subj="setupTrustCertCard"
          >
            <EuiText size="s">
              <p>{i18nTexts.certDescription}</p>
            </EuiText>
            <EuiSpacer size="xl" />

            {selectModeButton(SECURITY_MODEL.CERTIFICATE, 'setupTrustCertMode')}
          </EuiCard>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="xxl" />
      <ActionButtons
        showRequest={false}
        disabled={!securityModel}
        handleNext={() => {
          next(securityModel);
        }}
        onBack={onCancel}
        confirmFormText={
          <FormattedMessage
            id="xpack.remoteClusters.remoteClusterForm.nextButtonLabel"
            defaultMessage="Next"
          />
        }
        backFormText={
          <FormattedMessage
            id="xpack.remoteClusters.remoteClusterForm.cancelButtonLabel"
            defaultMessage="Cancel"
          />
        }
        nextButtonTestSubj={'remoteClusterTrustNextButton'}
        backButtonTestSubj={'remoteClusterTrustBackButton'}
      />
    </div>
  );
};
