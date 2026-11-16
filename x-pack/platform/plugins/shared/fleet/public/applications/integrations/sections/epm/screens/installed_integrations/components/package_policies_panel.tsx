/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useEuiPaddingCSS } from '@elastic/eui';

import type { PackageInfo } from '../../../../../../../../common';
import { IntegrationsStateContextProvider } from '../../../../../hooks';
import type { InstalledPackageUIPackageListItem } from '../types';
import { PackagePoliciesPage } from '../../detail/policies';
import { useViewPolicies } from '../hooks/use_url_filters';

import { PackagePanelTitle } from './package_panel_title';
import { ResizablePanel } from './resizable_panel';

export const PackagePoliciesPanel: React.FunctionComponent<{
  installedPackage: InstalledPackageUIPackageListItem;
}> = ({ installedPackage }) => {
  const { addViewPolicies } = useViewPolicies();
  const paddingStyles = useEuiPaddingCSS();
  const cssStyles = [paddingStyles.s];

  const content = (
    <div css={cssStyles}>
      <IntegrationsStateContextProvider>
        <PackagePoliciesPage embedded={true} packageInfo={installedPackage as any as PackageInfo} />
      </IntegrationsStateContextProvider>
    </div>
  );

  return (
    <ResizablePanel
      title={<PackagePanelTitle installedPackage={installedPackage} />}
      content={content}
      onClose={() => addViewPolicies('')}
    />
  );
};
