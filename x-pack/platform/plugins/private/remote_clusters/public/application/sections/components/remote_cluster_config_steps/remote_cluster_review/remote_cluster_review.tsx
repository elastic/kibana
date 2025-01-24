/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiSpacer,
  EuiText,
  EuiLink,
  EuiSteps,
  EuiTitle,
  EuiStepsProps,
  EuiCallOut,
} from '@elastic/eui';
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
        defaultMessage: 'Review the prerequisites',
      }),
      status: 'incomplete',
      children: (
        <EuiText size="s">
          <FormattedMessage
            id="xpack.remoteClusters.remoteClusterForm.onPrem.step1.paragraph"
            defaultMessage="Ensure security features are enabled on both clusters, and that both clusters meet the {requirmentsLink} needed to enable the connection. "
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
              defaultMessage="On the deployment you will use as remote, use the {apiLink} or {kibanaLink} to create a cross-cluster API key. Configure it with access to the indices you want to use for cross-cluster search or cross-cluster replication."
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
              defaultMessage="Copy the encoded key (encoded in the response) to a safe location. You will need it in the next step."
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
              id="xpack.remoteClusters.remoteClusterForm.cloud.api.step2.paragraph"
              defaultMessage="To add the previously created API key in the local deployment's keystore, access your {localDeploymentLink} and click Manage. From the deployment menu, under Security > Remote connections, you will be able to add the API key. For detailed instructions, refer to the Cloud UI or {documentationLink}."
              values={{
                localDeploymentLink: (
                  <EuiLink href={cloudDeploymentUrl} target="_blank">
                    {i18n.translate(
                      'xpack.remoteClusters.remoteClusterForm.cloud.api.step2.paragraph.localDeployment',
                      {
                        defaultMessage: "local deployment's Cloud UI",
                      }
                    )}
                  </EuiLink>
                ),
                documentationLink: (
                  <EuiLink href={cloudSetupTrustUrl} external={true} target="_blank">
                    {i18n.translate(
                      'xpack.remoteClusters.remoteClusterForm.cloud.api.step2.paragraph.documentation',
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
            defaultMessage="Confirm the following requirements are met before you proceed. If all requirements are not met, the remote cluster will not connect."
          />
        </EuiText>
        <EuiSpacer size="l" />
        <EuiSteps
          data-test-subj="remoteClusterReviewOnPremSteps"
          titleSize="s"
          steps={onPremSteps}
        />
        <EuiCallOut
          title={
            <FormattedMessage
              id="xpack.remoteClusters.remoteClusterForm.onPrem.trustWarningTitle"
              defaultMessage="Trust must be established before you proceed"
            />
          }
          color="warning"
          iconType="warning"
          size="s"
        >
          <EuiText size="s">
            <FormattedMessage
              id="xpack.remoteClusters.remoteClusterForm.onPrem.trustWarningDescription"
              defaultMessage='If the steps above are not completed, this Kibana configuration will show status of “not connected"'
            />
          </EuiText>
        </EuiCallOut>
      </>
    );
  };

  const getCloudInfo = () => {
    const cloudInfoSteps =
      securityModel === SECURITY_MODEL.API ? (
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
                defaultMessage="Set up trust through Cloud UI before proceeding with saving this configuration."
              />
            </h3>
          </EuiTitle>
          <EuiSpacer size="l" />
          <EuiText size="s">
            <FormattedMessage
              id="xpack.remoteClusters.remoteClusterForm.cloud.cert.paragraph1"
              defaultMessage="Go to Cloud UI of your local deployment and click “manage” next to the deployment you want to connect. From Security page in the deployment menu, you’ll be able to set up the connection in “Remote connections” section. "
            />
          </EuiText>
          <EuiSpacer size="l" />
          <EuiText size="s" data-test-subj="cloudCertDocumentation">
            <FormattedMessage
              id="xpack.remoteClusters.remoteClusterForm.cloud.cert.paragraph2"
              defaultMessage="Refer to the steps in Cloud UI and/or {documentationLink} for detailed instructions for the types of clusters you’re connecting."
              values={{
                documentationLink: (
                  <EuiLink href={cloudSetupTrustUrl} external={true} target="_blank">
                    {i18n.translate(
                      'xpack.remoteClusters.remoteClusterForm.cloud.cert.paragraph2.documentationLink',
                      {
                        defaultMessage: 'documentation',
                      }
                    )}
                  </EuiLink>
                ),
              }}
            />
          </EuiText>
          <EuiSpacer size="l" />
        </>
      );
    return (
      <>
        {cloudInfoSteps}
        <EuiCallOut
          title={
            <FormattedMessage
              id="xpack.remoteClusters.remoteClusterForm.cloud.trustWarningTitle"
              defaultMessage="Remote cluster will not be connected until all steps are completed"
            />
          }
          color="warning"
          iconType="warning"
          size="s"
        >
          <EuiText size="s">
            <FormattedMessage
              id="xpack.remoteClusters.remoteClusterForm.cloud.trustWarningDescription"
              defaultMessage="If the steps above are not completed, this Kibana configuration will show status of “not connected”."
            />
          </EuiText>
        </EuiCallOut>
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
