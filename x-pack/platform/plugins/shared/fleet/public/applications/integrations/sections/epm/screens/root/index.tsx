/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// PROTOTYPE: root package page. Nginx gets the hard-coded onboarding wizard. Other roots redirect
// straight to the create-package-policy page for the default schema's child, passing
// `?root=<name>`; the ECS / OTel toggle lives on that page.

import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { EuiCallOut, EuiSkeletonText } from '@elastic/eui';

import { INTEGRATIONS_PLUGIN_ID } from '../../../../constants';
import { useStartServices } from '../../../../hooks';
import { useRootPackage } from '../../../../../../hooks/use_root_package';

import { useRootSchemaPath } from './schema_toggle';
import { NginxOnboardingWizard } from './nginx_wizard';
import type { NginxSchema } from './nginx_wizard/model';
import { NGINX_ROOT_NAME } from './nginx_wizard/model';

export { RootSchemaToggle } from './schema_toggle';

export const RootPackagePage: React.FC = () => {
  const { rootName } = useParams<{ rootName: string }>();
  const { application } = useStartServices();
  const { root, options, defaultSchema, isLoading } = useRootPackage(rootName);
  const getSchemaPath = useRootSchemaPath();

  const option =
    options.find((o) => o.schema === defaultSchema && o.child) ?? options.find((o) => o.child);
  const isNginx = rootName === NGINX_ROOT_NAME;
  const path = root && option && !isNginx ? getSchemaPath(root.name, option) : undefined;

  useEffect(() => {
    if (path) application.navigateToApp(INTEGRATIONS_PLUGIN_ID, { path, replace: true });
  }, [application, path]);

  if (isLoading || path) return <EuiSkeletonText lines={6} />;
  if (isNginx && root && options.some((o) => o.child)) {
    return (
      <NginxOnboardingWizard
        root={root}
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
        root
          ? `No schema package for "${rootName}" is available in the registry`
          : `Root package "${rootName}" not found`
      }
      iconType="error"
    />
  );
};
