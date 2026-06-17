/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { SECURITY_MODEL } from '../../../../../../common/constants';
import {
  EuiSpacer,
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
} from '../../../../../shared_imports';

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
  currentSecurityModel: string;
}

export const RemoteClusterSetupTrust = ({
  next,
  currentSecurityModel,
  onSecurityChange,
}: Props) => {
  const { canUseAPIKeyTrustModel } = useContext(AppContext);
  const [securityModel, setSecurityModel] = useState<string>(currentSecurityModel);

  useEffect(() => {
    onSecurityChange(securityModel);
  }, [onSecurityChange, securityModel]);

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

      <EuiFlexGroup gutterSize="l" wrap justifyContent="center">
        {canUseAPIKeyTrustModel && (
          <EuiFlexItem style={{ maxWidth: CARD_MAX_WIDTH }}>
            <EuiCard
              paddingSize="l"
              data-test-subj="setupTrustApiMode"
              title={i18nTexts.apiKeyTitle}
              description={i18nTexts.apiKeyDescription}
              footer={
                <EuiText size="xs" color="subdued">
                  <p>
                    <FormattedMessage
                      id="xpack.remoteClusters.clusterWizard.trustStep.apiKeyNote"
                      defaultMessage="Both clusters must be on version {minAllowedVersion} or above."
                      values={{ minAllowedVersion: MIN_ALLOWED_VERSION_API_KEYS_METHOD }}
                    />
                  </p>
                </EuiText>
              }
              selectable={{
                onClick: () => {
                  setSecurityModel(SECURITY_MODEL.API);
                },
                isSelected: securityModel === SECURITY_MODEL.API,
              }}
            />
          </EuiFlexItem>
        )}
        <EuiFlexItem style={{ maxWidth: CARD_MAX_WIDTH }}>
          <EuiCard
            paddingSize="l"
            data-test-subj="setupTrustCertMode"
            title={i18nTexts.certTitle}
            description={i18nTexts.certDescription}
            selectable={{
              onClick: () => {
                setSecurityModel(SECURITY_MODEL.CERTIFICATE);
              },
              isSelected: securityModel === SECURITY_MODEL.CERTIFICATE,
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="xxl" />
      <ActionButtons
        showRequest={false}
        disabled={!securityModel}
        handleNext={() => {
          next(securityModel);
        }}
        confirmFormText={
          <FormattedMessage
            id="xpack.remoteClusters.remoteClusterForm.nextButtonLabel"
            defaultMessage="Next"
          />
        }
        nextButtonTestSubj={'remoteClusterTrustNextButton'}
      />
    </div>
  );
};
