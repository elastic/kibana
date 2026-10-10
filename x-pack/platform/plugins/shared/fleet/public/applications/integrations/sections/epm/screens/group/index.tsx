/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// PROTOTYPE: integration group page. Nginx gets the hard-coded onboarding wizard. Other groups
// redirect straight to the create-package-policy page for the default schema's child integration,
// passing `?group=<name>`; the ECS / OTel toggle lives on that page.

import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { EuiCallOut, EuiSkeletonText } from '@elastic/eui';

import { INTEGRATIONS_PLUGIN_ID } from '../../../../constants';
import { useStartServices } from '../../../../hooks';
import { useGroupPackage } from '../../../../../../hooks/use_group_package';

import { useGroupSchemaPath } from './schema_toggle';
import { NginxOnboardingWizard } from './nginx_wizard';
import type { NginxSchema } from './nginx_wizard/model';
import { NGINX_GROUP_NAME } from './nginx_wizard/model';

export { GroupSchemaToggle } from './schema_toggle';

export const GroupPackagePage: React.FC = () => {
  const { groupName } = useParams<{ groupName: string }>();
  const { application } = useStartServices();
  const { group, options, defaultSchema, isLoading } = useGroupPackage(groupName);
  const getSchemaPath = useGroupSchemaPath();

  const option =
    options.find((o) => o.schema === defaultSchema && o.child) ?? options.find((o) => o.child);
  const isNginx = groupName === NGINX_GROUP_NAME;
  const path = group && option && !isNginx ? getSchemaPath(group.name, option) : undefined;

  useEffect(() => {
    if (path) application.navigateToApp(INTEGRATIONS_PLUGIN_ID, { path, replace: true });
  }, [application, path]);

  if (isLoading || path) return <EuiSkeletonText lines={6} />;
  if (isNginx && group && options.some((o) => o.child)) {
    return (
      <NginxOnboardingWizard
        group={group}
        options={options}
        defaultSchema={(defaultSchema as NginxSchema) ?? 'otel'}
      />
    );
  }
  return (
    <EuiCallOut
      announceOnMount
      color="danger"
      title={
        group
          ? `No schema package for "${groupName}" is available in the registry`
          : `Integration group "${groupName}" not found`
      }
      iconType="error"
    />
  );
};
