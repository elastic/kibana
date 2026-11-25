/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { getEnabledInputsByPolicyTemplate } from '../../../../../../../../../common/services';
import type { AwsIdentityFederationSetupProps } from '../../../../../../../../components/cloud_connector/aws_connect_setup/aws_identity_federation_setup';
import { AwsIdentityFederationSetup } from '../../../../../../../../components/cloud_connector/aws_connect_setup/aws_identity_federation_setup';
import type { NewPackagePolicy } from '../../../../../../types';

type Props = Pick<
  AwsIdentityFederationSetupProps,
  'cloud' | 'accountType' | 'iacTemplateUrl' | 'onReadyChange'
> & {
  packageName: string;
  packageVersion: string;
  inputs: NewPackagePolicy['inputs'];
};

export function ClassicAwsIdentityFederationSetup({
  packageName,
  packageVersion,
  inputs,
  ...setupProps
}: Props) {
  const integrations = useMemo(
    () => [
      {
        name: packageName,
        version: packageVersion,
        policyTemplates: getEnabledInputsByPolicyTemplate({ inputs }),
      },
    ],
    [packageName, packageVersion, inputs]
  );

  return (
    <AwsIdentityFederationSetup
      {...setupProps}
      packageName={packageName}
      integrations={integrations}
    />
  );
}
