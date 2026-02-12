/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, memo } from 'react';
import { useRouteMatch, useLocation } from 'react-router-dom';

import { EuiEmptyPrompt, EuiFlexGroup } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import styled from '@emotion/styled';

import { EXCLUDED_FROM_PACKAGE_POLICY_COPY_PACKAGES } from '../../../../../../common/constants';

import { useGetOnePackagePolicy } from '../../../../integrations/hooks';
import { Loading } from '../../../components';
import type { EditPackagePolicyFrom } from '../create_package_policy_page/types';

import { CreatePackagePolicySinglePage } from '../create_package_policy_page/single_page_layout';
import { useBreadcrumbs, useGetOneAgentPolicy } from '../../../hooks';
import { useBreadcrumbs as useIntegrationsBreadcrumbs } from '../../../../integrations/hooks';
import { copyPackagePolicy } from '../../../../../../common/services/copy_package_policy_utils';

const ContentWrapper = styled(EuiFlexGroup)`
  height: 100%;
  margin: 0 auto;
`;

const IntegrationsBreadcrumb = memo<{
  pkgTitle: string;
  policyName: string;
  pkgkey: string;
}>(({ pkgTitle, policyName, pkgkey }) => {
  useIntegrationsBreadcrumbs('integration_policy_copy', { policyName, pkgTitle, pkgkey });
  return null;
});

const PoliciesBreadcrumb: React.FunctionComponent<{
  policyName: string;
  policyId: string;
}> = ({ policyName, policyId }) => {
  useBreadcrumbs('copy_integration', { policyName, policyId });
  return null;
};

const InstalledIntegrationsBreadcrumb = memo<{
  policyName: string;
}>(({ policyName }) => {
  useIntegrationsBreadcrumbs('integration_policy_copy_from_installed', { policyName });
  return null;
});

export const CopyPackagePolicyPage = memo(() => {
  const {
    params: { packagePolicyId, policyId },
  } = useRouteMatch<{ packagePolicyId: string; policyId?: string }>();

  const packagePolicy = useGetOnePackagePolicy(packagePolicyId);
  const agentPolicy = useGetOneAgentPolicy(policyId);

  const packagePolicyData = useMemo(() => {
    if (packagePolicy.data?.item) {
      return copyPackagePolicy(packagePolicy.data.item);
    }
  }, [packagePolicy.data?.item]);

  // Parse the 'from' query parameter to determine navigation after save
  const { search } = useLocation();

  const from = useMemo(() => {
    const qs = new URLSearchParams(search);
    const qsFrom = (qs.get('from') as EditPackagePolicyFrom | null) ?? 'fleet-policy-list';

    if (qsFrom === 'fleet-policy-list') {
      return 'copy-from-fleet-policy-list';
    } else if (qsFrom === 'installed-integrations') {
      return 'copy-from-installed-integrations';
    } else {
      return 'copy-from-integrations-policy-list';
    }
  }, [search]);

  if (packagePolicy.isLoading || !packagePolicy.data) {
    return (
      <>
        <Loading />
      </>
    );
  }

  const breadcrumb =
    from === 'copy-from-fleet-policy-list' && policyId ? (
      <PoliciesBreadcrumb policyName={agentPolicy.data?.item?.name || ''} policyId={policyId} />
    ) : from === 'copy-from-installed-integrations' ? (
      <InstalledIntegrationsBreadcrumb policyName={packagePolicy.data?.item?.name || ''} />
    ) : (
      <IntegrationsBreadcrumb
        pkgTitle={packagePolicy.data?.item?.package?.title || ''}
        policyName={packagePolicy.data?.item?.name || ''}
        pkgkey={packagePolicy.data?.item?.package?.name || ''}
      />
    );

  const pkgName = packagePolicy.data?.item?.package?.name;

  if (pkgName && EXCLUDED_FROM_PACKAGE_POLICY_COPY_PACKAGES.includes(pkgName)) {
    return (
      <ContentWrapper>
        {breadcrumb}
        <EuiEmptyPrompt
          title={
            <FormattedMessage
              id="xpack.fleet.copyPackagePolicyPage.notAllowedTitle"
              defaultMessage="Copying this integration policy is not allowed."
            />
          }
          color="danger"
          iconType="error"
        />
      </ContentWrapper>
    );
  }

  return (
    <>
      {breadcrumb}
      <CreatePackagePolicySinglePage
        from={from}
        pkgName={packagePolicy.data!.item!.package!.name}
        pkgVersion={packagePolicy.data!.item!.package!.version}
        defaultPolicyData={packagePolicyData}
        noBreadcrumb={true}
        prerelease={true}
      />
    </>
  );
});
