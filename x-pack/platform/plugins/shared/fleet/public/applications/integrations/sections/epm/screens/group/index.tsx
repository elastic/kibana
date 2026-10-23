/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// PROTOTYPE: integration group page. Every group (registry `GET /groups`) gets the generic
// onboarding wizard, driven by its member packages' metadata. No per-group code.
// The route is a thin host: full page, step in the URL, exits to the integration (done) or to
// browse (cancel). The browse tile opens the same wizard in a modal (group_wizard_modal.tsx).
// The create-package-policy page keeps its `?group=<name>` schema toggle for direct links.
// User-facing copy says "integration", never "group".

import React from 'react';
import { useParams } from 'react-router-dom';
import { EuiCallOut, EuiSkeletonText } from '@elastic/eui';

import { INTEGRATIONS_PLUGIN_ID } from '../../../../constants';
import { useBreadcrumbs, useLink, useStartServices } from '../../../../hooks';
import { useGroupPackage } from '../../../../../../hooks/use_group_package';
import type { GroupMemberOption } from '../../../../../../hooks/use_group_package';
import type { IntegrationGroup } from '../../../../../../types';

import type { GroupWizardExitResult } from './group_wizard';
import { GroupOnboardingWizard } from './group_wizard';

export { GroupSchemaToggle } from './schema_toggle';
export { GroupWizardModal, useGroupWizardModal } from './group_wizard_modal';

const GroupWizardRoute: React.FC<{ group: IntegrationGroup; options: GroupMemberOption[] }> = ({
  group,
  options,
}) => {
  useBreadcrumbs('integration_group', { pkgTitle: group.title });
  const { application } = useStartServices();
  const { getPath } = useLink();
  const onExit = ({ reason, packageName, packageVersion }: GroupWizardExitResult) =>
    application.navigateToApp(INTEGRATIONS_PLUGIN_ID, {
      path:
        reason === 'done' && packageName
          ? getPath('integration_details_policies', { pkgkey: `${packageName}-${packageVersion}` })
          : getPath('integrations_all', {}),
    });
  return (
    <GroupOnboardingWizard
      group={group}
      options={options}
      stepState="url"
      layout="page"
      exitLabel="Take me to my integration"
      onExit={onExit}
    />
  );
};

export const GroupPackagePage: React.FC = () => {
  const { groupName } = useParams<{ groupName: string }>();
  const { group, options, isLoading } = useGroupPackage(groupName);

  if (isLoading) return <EuiSkeletonText lines={6} />;
  // Schemas whose package isn't in the registry (for this stack) are already left out.
  if (group && options.length) {
    return <GroupWizardRoute group={group} options={options} />;
  }
  return (
    <EuiCallOut
      announceOnMount
      color="danger"
      title={
        group
          ? `"${group.title}" can't be added: none of its packages are available in the registry`
          : `Integration "${groupName}" not found`
      }
      iconType="error"
    />
  );
};
