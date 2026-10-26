/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useEuiPaddingCSS } from '@elastic/eui';

import type { CloudOnboardingDeploymentListItem } from '../../../../../../../../common/types';
import type { InstalledPackageUIPackageListItem } from '../types';
import { useViewCollectionInstances } from '../hooks/use_url_filters';

import { CollectionInstancesTable } from './collection_instances_table';
import { PackagePanelTitle } from './package_panel_title';
import { ResizablePanel } from './resizable_panel';

export const CollectionInstancesPanel: React.FunctionComponent<{
  installedPackage: InstalledPackageUIPackageListItem;
  instances: CloudOnboardingDeploymentListItem[];
}> = ({ installedPackage, instances }) => {
  const { addViewCollectionInstances } = useViewCollectionInstances();
  const paddingStyles = useEuiPaddingCSS();

  return (
    <ResizablePanel
      title={<PackagePanelTitle installedPackage={installedPackage} />}
      content={
        <div css={[paddingStyles.s]}>
          <CollectionInstancesTable instances={instances} />
        </div>
      }
      onClose={() => addViewCollectionInstances('')}
    />
  );
};
