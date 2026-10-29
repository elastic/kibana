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
import { useViewInstances } from '../hooks/use_url_filters';

import { InstancesTable } from './instances_table';
import { PackagePanelTitle } from './package_panel_title';
import { ResizablePanel } from './resizable_panel';

export const INSTANCES_PAGE_SIZE = 20;

/** The instances that cover a package, a page at a time. */
export const InstancesPanel: React.FunctionComponent<{
  installedPackage: PanelPackage;
}> = ({ installedPackage }) => {
  const { addViewInstances } = useViewInstances();
  const paddingStyles = useEuiPaddingCSS();
  const [pageIndex, setPageIndex] = useState(0);

  const { data, isLoading, isFetching, isError } = useGetCloudOnboardingDeploymentsQuery({
    provider: 'aws',
    packageName: installedPackage.name,
    page: pageIndex + 1,
    perPage: INSTANCES_PAGE_SIZE,
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
          <InstancesTable
            instances={data?.items ?? []}
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
              pageSize: INSTANCES_PAGE_SIZE,
              totalItemCount: data?.total ?? 0,
            }}
            onPageChange={setPageIndex}
          />
        </div>
      }
      onClose={() => addViewInstances('')}
    />
  );
};
