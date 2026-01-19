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
import { useBreadcrumbs } from '../../../hooks';

const ContentWrapper = styled(EuiFlexGroup)`
  height: 100%;
  margin: 0 auto;
`;

export const CopyPackagePolicyPage = memo(() => {
  const {
    params: { packagePolicyId },
  } = useRouteMatch<{ packagePolicyId: string }>();

  const packagePolicy = useGetOnePackagePolicy(packagePolicyId);

  useBreadcrumbs('copy_integration', {
    policyId: packagePolicyId,
  });

  const packagePolicyData = useMemo(() => {
    if (packagePolicy.data?.item) {
      return {
        ...packagePolicy.data.item,
        name: 'copy-' + packagePolicy.data.item.name,
      };
    }
  }, [packagePolicy.data?.item]);

  // Parse the 'from' query parameter to determine navigation after save
  const { search } = useLocation();
  const qs = new URLSearchParams(search);
  const fromQs = qs.get('from') as EditPackagePolicyFrom | null;

  if (packagePolicy.isLoading) {
    return <Loading />;
  }
  const pkgName = packagePolicy.data?.item?.package?.name;

  if (pkgName && EXCLUDED_FROM_PACKAGE_POLICY_COPY_PACKAGES.includes(pkgName)) {
    return (
      <ContentWrapper>
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
    <CreatePackagePolicySinglePage
      from={fromQs || ('copy-from-integrations-policy-list' as EditPackagePolicyFrom)}
      pkgName={packagePolicy.data!.item!.package!.name}
      pkgVersion={packagePolicy.data!.item!.package!.version}
      defaultPolicyData={packagePolicyData}
      noBreadcrumbs={true}
      prerelease={true}
    />
  );
});
