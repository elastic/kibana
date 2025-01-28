/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiSpacer, EuiText, EuiLink, EuiSteps, EuiTitle, EuiStepsProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { RequestError } from '../../../../../types';
import { SECURITY_MODEL } from '../../../../../../common/constants';
import {
  apiKeys,
  cloudCreateApiKey,
  cloudSetupTrustUrl,
  onPremPrerequisitesApiKey,
  onPremSecurityApiKey,
  onPremPrerequisitesCert,
  onPremSecurityCert,
} from '../../../../services/documentation';
import { ClusterPayload } from '../../../../../../common/lib';
import { AppContext } from '../../../../app_context';
import { ActionButtons, SaveError } from '../components';

interface Props {
  onBack?: () => void;
  onSubmit: () => void;
  isSaving?: boolean;
  saveError?: RequestError;
  cluster: ClusterPayload;
  securityModel: string;
}

export const RemoteClusterReview = ({
  onBack,
  onSubmit,
  isSaving,
  saveError,
  cluster,
  securityModel,
}: Props) => {
  const context = useContext(AppContext);
  const { isCloudEnabled, cloudDeploymentUrl } = context;

  const onPremSteps: EuiStepsProps['steps'] = [
    {
      title: i18n.translate('xpack.remoteClusters.remoteClusterForm.onPrem.step1.title', {
        defaultMessage: 'Confirm both clusters are compatible',
      }),
      status: 'incomplete',
      children: (
        <EuiText size="s">
          <FormattedMessage
            id="xpack.remoteClusters.remoteClusterForm.onPrem.step1.paragraph"
            defaultMessage="Ensure that both clusters meet the {requirmentsLink} needed to enable the connection."
            values={{
              requirmentsLink: (
                <EuiLink
                  href={
                    securityModel === SECURITY_MODEL.API
                      ? onPremPrerequisitesApiKey
                      : onPremPrerequisitesCert
                  }
                  external={true}
                  target="_blank"
                  data-test-subj="remoteClusterReviewOnPremStep1"
                >
                  {i18n.translate(
                    'xpack.remoteClusters.remoteClusterForm.onPrem.step1.requirements',
                    {
                      defaultMessage: 'requirements',
                    }
                  )}
                </EuiLink>
              ),
            }}
          />
        </EuiText>
      ),
    },
    {
      title: i18n.translate('xpack.remoteClusters.remoteClusterForm.onPrem.step2.title', {
        defaultMessage: 'Confirm trust is established',
      }),
      status: 'incomplete',
      children: (
        <EuiText size="s">
          <FormattedMessage
            id="xpack.remoteClusters.remoteClusterForm.onPrem.step2.paragraph"
            defaultMessage="Follow the {addRemoteClusterGuideLink} to establish trust between local and remote clusters."
            values={{
              addRemoteClusterGuideLink: (
                <EuiLink
                  href={
                    securityModel === SECURITY_MODEL.API ? onPremSecurityApiKey : onPremSecurityCert
                  }
                  external={true}
                  target="_blank"
                  data-test-subj="remoteClusterReviewOnPremStep2"
                >
                  {i18n.translate(
                    'xpack.remoteClusters.remoteClusterForm.onPrem.step1.addClustersGuide',
                    {
                      defaultMessage: 'Add remote clusters guide',
                    }
                  )}
                </EuiLink>
              ),
            }}
          />
        </EuiText>
      ),
    },
  ];

  const cloudSteps: EuiStepsProps['steps'] = [
    {
      title: i18n.translate('xpack.remoteClusters.remoteClusterForm.cloud.api.step1.title', {
        defaultMessage: 'Create a cross-cluster API key on the remote deployment',
      }),
      status: 'incomplete',
      'data-test-subj': 'cloudApiKeySteps',
      children: (
        <>
          <EuiText size="s">
            <FormattedMessage
              id="xpack.remoteClusters.remoteClusterForm.cloud.api.step1.paragraph1"
              defaultMessage="On the remote cluster or deployment, use the {apiLink} or {kibanaLink} to create a cross-cluster API key. Configure it with access to the indices you want to use for cross-cluster search or cross-cluster replication."
              values={{
                apiLink: (
                  <EuiLink href={cloudCreateApiKey} external={true} target="_blank">
                    {i18n.translate(
                      'xpack.remoteClusters.remoteClusterForm.cloud.api.step1.paragraph1.api',
                      {
                        defaultMessage: 'Elasticsearch API',
                      }
                    )}
                  </EuiLink>
                ),
                kibanaLink: (
                  <EuiLink href={apiKeys} external={true} target="_blank">
                    {i18n.translate(
                      'xpack.remoteClusters.remoteClusterForm.cloud.api.step1.paragraph1.kibana',
                      {
                        defaultMessage: 'Kibana',
                      }
                    )}
                  </EuiLink>
                ),
              }}
            />
          </EuiText>
          <EuiSpacer size="l" />
          <EuiText size="s">
            <FormattedMessage
              id="xpack.remoteClusters.remoteClusterForm.cloud.api.step1.paragraph2"
              defaultMessage="Copy the encoded key (the “encoded” value from the response) to a safe location. You will need it in the next step."
            />
          </EuiText>
        </>
      ),
    },
    {
      title: i18n.translate('xpack.remoteClusters.remoteClusterForm.cloud.api.step2.title', {
        defaultMessage: 'Configure your local deployment',
      }),
      status: 'incomplete',
      children: (
        <>
          <EuiText size="s">
            <FormattedMessage
              id="xpack.remoteClusters.remoteClusterForm.cloud.api.step2.intro"
              defaultMessage="Add the key that you created to your local deployment's keystore:"
            />
          </EuiText>
          <EuiText size="s">
            <ol>
              <li>
                <FormattedMessage
                  id="xpack.remoteClusters.remoteClusterForm.cloud.api.step2.list1"
                  defaultMessage="Go to the {managementLink} page for your deployment."
                  values={{
                    managementLink: (
                      <EuiLink href={cloudDeploymentUrl} target="_blank">
                        {i18n.translate(
                          'xpack.remoteClusters.remoteClusterForm.cloud.api.step2.list1.management',
                          {
                            defaultMessage: 'management',
                          }
                        )}
                      </EuiLink>
                    ),
                  }}
                />
              </li>
              <li>
                <FormattedMessage
                  id="xpack.remoteClusters.remoteClusterForm.cloud.api.step2.list2"
                  defaultMessage="From the navigation menu, click Security."
                />
              </li>
              <li>
                <FormattedMessage
                  id="xpack.remoteClusters.remoteClusterForm.cloud.api.step2.list3"
                  defaultMessage="In the Remote connections section, add your API key."
                />
              </li>
            </ol>
          </EuiText>
          <EuiSpacer size="l" />
          <EuiText size="s">
            <FormattedMessage
              id="xpack.remoteClusters.remoteClusterForm.cloud.api.step2.end"
              defaultMessage="Check {documentationLink} for more detailed instructions."
              values={{
                documentationLink: (
                  <EuiLink href={cloudSetupTrustUrl} external={true} target="_blank">
                    {i18n.translate(
                      'xpack.remoteClusters.remoteClusterForm.cloud.api.step2.end.documentation',
                      {
                        defaultMessage: 'documentation',
                      }
                    )}
                  </EuiLink>
                ),
              }}
            />
          </EuiText>
        </>
      ),
    },
  ];

  const getOnPremInfo = () => {
    return (
      <>
        <EuiText size="s">
          <FormattedMessage
            id="xpack.remoteClusters.remoteClusterForm.onPrem.disclaimerInfo"
            defaultMessage="Check that the following requirements are completed to ensure that both clusters can communicate:"
          />
        </EuiText>
        <EuiSpacer size="l" />
        <EuiSteps
          data-test-subj="remoteClusterReviewOnPremSteps"
          titleSize="s"
          steps={onPremSteps}
        />
      </>
    );
  };

  const getCloudInfo = () => {
    return securityModel === SECURITY_MODEL.API ? (
      <>
        <EuiText size="s">
          <FormattedMessage
            id="xpack.remoteClusters.remoteClusterForm.cloud.disclaimerInfo"
            defaultMessage="Make sure you complete the steps below before proceeding with saving this configuration."
          />
        </EuiText>
        <EuiSpacer size="l" />
        <EuiSteps titleSize="s" steps={cloudSteps} />
      </>
    ) : (
      <>
        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              id="xpack.remoteClusters.remoteClusterForm.cloud.cert.title"
              defaultMessage="Confirm trust is established."
            />
          </h3>
        </EuiTitle>
        <EuiSpacer size="l" />
        <EuiText size="s" data-test-subj="cloudCertDocumentation">
          <FormattedMessage
            id="xpack.remoteClusters.remoteClusterForm.cloud.cert.paragraph"
            defaultMessage="Before you proceed, ensure that trust is correctly configured between both clusters. If all requirements are not met, the remote cluster won't connect. {detailsLink}"
            values={{
              detailsLink: (
                <EuiLink href={cloudSetupTrustUrl} external={true} target="_blank">
                  {i18n.translate(
                    'xpack.remoteClusters.remoteClusterForm.cloud.cert.paragraph.documentationLink',
                    {
                      defaultMessage: 'Read details.',
                    }
                  )}
                </EuiLink>
              ),
            }}
            data-test-subj="cloudCertDocumentation"
          />
        </EuiText>
      </>
    );
  };

  return (
    <>
      {saveError && <SaveError saveError={saveError} />}
      {isCloudEnabled ? getCloudInfo() : getOnPremInfo()}
      <EuiSpacer size="xl" />
      <ActionButtons
        showRequest={true}
        isSaving={isSaving}
        handleNext={onSubmit}
        onBack={onBack}
        confirmFormText={
          <FormattedMessage
            id="xpack.remoteClusters.remoteClusterForm.addClusterButtonLabel"
            defaultMessage="Add remote cluster"
          />
        }
        backFormText={
          <FormattedMessage
            id="xpack.remoteClusters.remoteClusterForm.backButtonLabel"
            defaultMessage="Back"
          />
        }
        cluster={cluster}
        nextButtonTestSubj={'remoteClusterReviewtNextButton'}
        backButtonTestSubj={'remoteClusterReviewtBackButton'}
      />
    </>
  );
};
