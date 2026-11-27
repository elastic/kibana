/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';

import {
  applyVarsAtTarget,
  extractRawCredentialVars,
  getCredentialStorageScope,
  resolveVarTarget,
} from '../../../../../../../../../common';
import { getEnabledInputsByPolicyTemplate } from '../../../../../../../../../common/services';
import type { AwsIdentityFederationSetupProps } from '../../../../../../../../components/cloud_connector/aws_connect_setup/aws_identity_federation_setup';
import { AwsIdentityFederationSetup } from '../../../../../../../../components/cloud_connector/aws_connect_setup/aws_identity_federation_setup';
import { useGetCloudConnectors } from '../../../../../../../../components/cloud_connector/hooks/use_get_cloud_connectors';
import type { UpdatePolicy } from '../../../../../../../../components/cloud_connector/types';
import {
  isAwsCloudConnectorVars,
  updateInputVarsWithAwsCredentials,
} from '../../../../../../../../components/cloud_connector/utils';
import type { NewPackagePolicy, PackageInfo } from '../../../../../../types';

type Props = Pick<
  AwsIdentityFederationSetupProps,
  'cloud' | 'accountType' | 'iacTemplateUrl' | 'onReadyChange'
> & {
  packageInfo: PackageInfo;
  packagePolicy: NewPackagePolicy;
  updatePolicy: UpdatePolicy;
};

// A stack-update launch must not write the rendered template to the saved connector: the user may
// never apply it. The template details are kept by the host instead (stored after the policy saves).
const noopOnIacTemplateRecorded: AwsIdentityFederationSetupProps['onIacTemplateRecorded'] =
  () => {};

/** The identity's `cloud_connector_id` and role ARN, written where the package keeps credentials. */
const withAwsIdentity = (
  policy: NewPackagePolicy,
  packageInfo: PackageInfo,
  connectorId: string | undefined,
  roleArn: string | undefined
): NewPackagePolicy => {
  const vars = updateInputVarsWithAwsCredentials(
    extractRawCredentialVars(policy, packageInfo),
    roleArn ? { roleArn } : undefined
  );
  const updated = vars
    ? applyVarsAtTarget(
        policy,
        vars,
        resolveVarTarget(policy, getCredentialStorageScope(packageInfo)).target
      )
    : policy;
  return { ...updated, cloud_connector_id: connectorId };
};

export function PackagePolicyAwsIdentityFederationSetup({
  packageInfo,
  packagePolicy,
  updatePolicy,
  ...setupProps
}: Props) {
  const packageName = packageInfo.name;
  const { inputs } = packagePolicy;
  const integrations = useMemo(
    () => [
      {
        name: packageName,
        policyTemplates: getEnabledInputsByPolicyTemplate({ inputs }),
      },
    ],
    [packageName, inputs]
  );

  // Same list and filters as the shared setup, so the query is served from the same cache.
  const { data: connectors = [] } = useGetCloudConnectors({
    cloudProvider: 'aws',
    accountType: setupProps.accountType,
    packageName,
  });

  const attachedConnectorId = packagePolicy.cloud_connector_id ?? undefined;
  const currentRoleArn = extractRawCredentialVars(packagePolicy, packageInfo)?.role_arn?.value;
  const onConnectorIdChange = useCallback(
    (connectorId: string | undefined) => {
      // An identity not in the list yet attaches nothing; validation keeps Save disabled until
      // the list refreshes and this runs again.
      const connector = connectorId ? connectors.find((c) => c.id === connectorId) : undefined;
      const roleArnValue =
        connector && isAwsCloudConnectorVars(connector.vars, 'aws')
          ? connector.vars.role_arn?.value
          : undefined;
      const roleArn = typeof roleArnValue === 'string' ? roleArnValue : undefined;
      if (connector?.id === attachedConnectorId && roleArn === currentRoleArn) {
        return;
      }
      updatePolicy({
        updatedPolicy: withAwsIdentity(packagePolicy, packageInfo, connector?.id, roleArn),
      });
    },
    [attachedConnectorId, connectors, currentRoleArn, packageInfo, packagePolicy, updatePolicy]
  );

  return (
    <AwsIdentityFederationSetup
      // The setup renders its template for one integration set and must be remounted when the
      // enabled inputs change (see the `integrations` prop contract). The identity on the policy
      // is handed back so it stays selected and its coverage is checked again.
      key={JSON.stringify(integrations)}
      {...setupProps}
      packageName={packageName}
      integrations={integrations}
      initialConnectorId={attachedConnectorId}
      onConnectorIdChange={onConnectorIdChange}
      onIacTemplateRecorded={noopOnIacTemplateRecorded}
    />
  );
}
