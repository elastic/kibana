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
import { i18n } from '@kbn/i18n';
import styled from '@emotion/styled';

import { EXCLUDED_FROM_PACKAGE_POLICY_COPY_PACKAGES } from '../../../../../../common/constants';

import { Loading, Error as ErrorComponent } from '../../../components';
import type { EditPackagePolicyFrom } from '../create_package_policy_page/types';

import { CreatePackagePolicySinglePage } from '../create_package_policy_page/single_page_layout';
import { useBreadcrumbs, useGetOneAgentPolicy, useIsAgentlessQueryParam } from '../../../hooks';
import { useBreadcrumbs as useIntegrationsBreadcrumbs } from '../../../../integrations/hooks';
import { copyPackagePolicy } from '../../../../../../common/services/copy_package_policy_utils';

import { useCopyPackagePolicyData } from './hooks/use_copy_package_policy_data';

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

  const { search } = useLocation();

  // Detect-before-read hint: agentless copies read/hydrate through the agentless API instead of the
  // package-policy/agent-policy APIs. Always false when the agentless policies UI kill switch is
  // off, so the copy falls back to the legacy APIs.
  const isAgentless = useIsAgentlessQueryParam();

  const {
    item: sourcePolicy,
    isLoading,
    isError,
    error,
  } = useCopyPackagePolicyData(packagePolicyId, {
    isAgentless,
  });
  // Agentless deployments have no user-facing agent policy, so skip the agent-policy read for them.
  const agentPolicy = useGetOneAgentPolicy(isAgentless ? undefined : policyId);

  const packagePolicyData = useMemo(() => {
    if (sourcePolicy) {
      return copyPackagePolicy(sourcePolicy);
    }
  }, [sourcePolicy]);

  // Determine navigation after save from the 'from' query parameter
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

  // Without this, a failed source-policy read leaves `isLoading` false and `sourcePolicy`
  // undefined, which would otherwise render the loading spinner forever with no recovery path.
  if (isError) {
    // Ensure the error is typed as `string | Error` for the Error component.
    const displayError: string | Error =
      error instanceof Error
        ? error
        : i18n.translate('xpack.fleet.copyPackagePolicyPage.loadingErrorGenericMessage', {
            defaultMessage: 'An error occurred while loading the integration policy.',
          });
    return (
      <ContentWrapper justifyContent="center" alignItems="center">
        <ErrorComponent
          title={
            <FormattedMessage
              id="xpack.fleet.copyPackagePolicyPage.loadingErrorTitle"
              defaultMessage="Unable to load the integration policy to copy"
            />
          }
          error={displayError}
        />
      </ContentWrapper>
    );
  }

  if (isLoading || !sourcePolicy) {
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
      <InstalledIntegrationsBreadcrumb policyName={sourcePolicy.name || ''} />
    ) : (
      <IntegrationsBreadcrumb
        pkgTitle={sourcePolicy.package?.title || ''}
        policyName={sourcePolicy.name || ''}
        pkgkey={sourcePolicy.package?.name || ''}
      />
    );

  const pkgName = sourcePolicy.package?.name;

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
        pkgName={sourcePolicy.package!.name}
        pkgVersion={sourcePolicy.package!.version}
        defaultPolicyData={packagePolicyData}
        noBreadcrumb={true}
        prerelease={true}
      />
    </>
  );
});
