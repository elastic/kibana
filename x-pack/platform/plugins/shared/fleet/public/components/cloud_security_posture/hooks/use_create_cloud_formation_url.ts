/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import type {
  CloudFormationProps,
  CloudSecurityIntegrationAwsAccountType,
} from '../../agent_enrollment_flyout/types';

import { useAgentVersion } from '../../../hooks';

const CLOUD_FORMATION_DEFAULT_ACCOUNT_TYPE = 'single-account';

export const useCreateCloudFormationUrl = ({
  enrollmentAPIKey,
  cloudFormationProps,
  fleetServerHost,
}: {
  enrollmentAPIKey?: string;
  cloudFormationProps?: CloudFormationProps;
  fleetServerHost?: string;
}) => {
  const agentVersion = useAgentVersion();

  let isError = false;
  let error: string | undefined;

  if (!fleetServerHost) {
    isError = true;
    error = i18n.translate('xpack.fleet.agentEnrollment.cloudFormation.noFleetServerHost', {
      defaultMessage: 'No Fleet Server host found',
    });
  }

  if (!enrollmentAPIKey) {
    isError = true;
    error = i18n.translate('xpack.fleet.agentEnrollment.cloudFormation.noApiKey', {
      defaultMessage: 'No enrollment token found',
    });
  }

  const cloudFormationUrl =
    enrollmentAPIKey && fleetServerHost && cloudFormationProps?.templateUrl && agentVersion
      ? createCloudFormationUrl(
          cloudFormationProps?.templateUrl,
          enrollmentAPIKey,
          fleetServerHost,
          agentVersion,
          cloudFormationProps?.awsAccountType
        )
      : undefined;

  return {
    cloudFormationUrl,
    isError,
    error,
  };
};

const createCloudFormationUrl = (
  templateURL: string,
  enrollmentToken: string,
  fleetUrl: string,
  agentVersion: string,
  awsAccountType: CloudSecurityIntegrationAwsAccountType | undefined
) => {
  let cloudFormationUrl;

  /*
    template url has `&param_ElasticAgentVersion=KIBANA_VERSION` part. KIBANA_VERSION is used for templating as agent version used to match Kibana version, but now it's not necessarily the case
   */
  cloudFormationUrl = templateURL
    .replace('FLEET_ENROLLMENT_TOKEN', enrollmentToken)
    .replace('FLEET_URL', fleetUrl)
    .replace('KIBANA_VERSION', agentVersion);

  if (cloudFormationUrl.includes('ACCOUNT_TYPE')) {
    cloudFormationUrl = cloudFormationUrl.replace(
      'ACCOUNT_TYPE',
      getAwsAccountType(awsAccountType)
    );
  }

  return new URL(cloudFormationUrl).toString();
};

const getAwsAccountType = (awsAccountType: CloudSecurityIntegrationAwsAccountType | undefined) => {
  return awsAccountType ? awsAccountType : CLOUD_FORMATION_DEFAULT_ACCOUNT_TYPE;
};
