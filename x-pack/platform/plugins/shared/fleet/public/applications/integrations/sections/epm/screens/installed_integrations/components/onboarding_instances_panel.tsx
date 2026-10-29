/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useEuiPaddingCSS } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { CloudOnboardingDeploymentListItem } from '../../../../../../../../common/types';
import type { PanelPackage } from '../types';
import { useViewOnboardingInstances } from '../hooks/use_url_filters';

import { OnboardingInstancesTable } from './onboarding_instances_table';
import { PackagePanelTitle } from './package_panel_title';
import { ResizablePanel } from './resizable_panel';

export const OnboardingInstancesPanel: React.FunctionComponent<{
  installedPackage: PanelPackage;
  onboardingInstances: CloudOnboardingDeploymentListItem[];
  isLoading?: boolean;
}> = ({ installedPackage, onboardingInstances, isLoading = false }) => {
  const { addViewOnboardingInstances } = useViewOnboardingInstances();
  const paddingStyles = useEuiPaddingCSS();

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
            onboardingInstances={onboardingInstances}
            packageName={installedPackage.name}
            isLoading={isLoading}
          />
        </div>
      }
      onClose={() => addViewOnboardingInstances('')}
    />
  );
};
