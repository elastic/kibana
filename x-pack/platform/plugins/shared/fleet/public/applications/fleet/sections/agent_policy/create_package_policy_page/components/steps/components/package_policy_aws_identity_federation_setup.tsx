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
  inputs: NewPackagePolicy['inputs'];
};

// Policy Save is blocked on this page, so a launch must not write the rendered template to the
// saved connector. The identity attachment issue (ingest-dev#10669) supplies the real recorder.
const noopOnIacTemplateRecorded: AwsIdentityFederationSetupProps['onIacTemplateRecorded'] =
  () => {};

export function PackagePolicyAwsIdentityFederationSetup({
  packageName,
  inputs,
  ...setupProps
}: Props) {
  const integrations = useMemo(
    () => [
      {
        name: packageName,
        policyTemplates: getEnabledInputsByPolicyTemplate({ inputs }),
      },
    ],
    [packageName, inputs]
  );

  return (
    <AwsIdentityFederationSetup
      // The setup renders its template for one integration set and must be remounted when the
      // enabled inputs change (see the `integrations` prop contract).
      key={JSON.stringify(integrations)}
      {...setupProps}
      packageName={packageName}
      integrations={integrations}
      onIacTemplateRecorded={noopOnIacTemplateRecorded}
    />
  );
}
