/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import { useEuiPaddingCSS } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { useGetCloudOnboardingDeploymentsQuery } from '../../../../../../../hooks';
import type { PanelPackage } from '../types';
import { useViewOnboardingInstances } from '../hooks/use_url_filters';

import { OnboardingInstancesTable } from './onboarding_instances_table';
import { PackagePanelTitle } from './package_panel_title';
import { ResizablePanel } from './resizable_panel';

export const ONBOARDING_INSTANCES_PAGE_SIZE = 20;

/** The instances that cover a package, a page at a time. */
export const OnboardingInstancesPanel: React.FunctionComponent<{
  installedPackage: PanelPackage;
}> = ({ installedPackage }) => {
  const { addViewOnboardingInstances } = useViewOnboardingInstances();
  const paddingStyles = useEuiPaddingCSS();
  const [pageIndex, setPageIndex] = useState(0);

  const { data, isLoading, isFetching, isError } = useGetCloudOnboardingDeploymentsQuery({
    provider: 'aws',
    packageName: installedPackage.name,
    page: pageIndex + 1,
    perPage: ONBOARDING_INSTANCES_PAGE_SIZE,
  });

  // Deleting the last instance of a page leaves it empty: go back to the previous one.
  useEffect(() => {
    if (pageIndex > 0 && data && data.items.length === 0) {
      setPageIndex(pageIndex - 1);
    }
  }, [data, pageIndex]);

  return (
    <ResizablePanel
      title={
        <PackagePanelTitle
          installedPackage={installedPackage}
          // Tells this panel apart from View policies, which shows the same package title.
          subtitle={i18n.translate('xpack.fleet.epmInstalledIntegrations.instances.panelSubtitle', {
            defaultMessage: 'Instances',
          })}
        />
      }
      content={
        <div css={[paddingStyles.s]}>
          <OnboardingInstancesTable
            onboardingInstances={data?.items ?? []}
            packageName={installedPackage.name}
            isLoading={isLoading || isFetching}
            error={
              isError
                ? i18n.translate('xpack.fleet.epmInstalledIntegrations.instances.loadError', {
                    defaultMessage: 'Could not load the instances of this integration.',
                  })
                : undefined
            }
            pagination={{
              pageIndex,
              pageSize: ONBOARDING_INSTANCES_PAGE_SIZE,
              totalItemCount: data?.total ?? 0,
            }}
            onPageChange={setPageIndex}
          />
        </div>
      }
      onClose={() => addViewOnboardingInstances('')}
    />
  );
};
