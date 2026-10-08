/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// PROTOTYPE: top-level ECS / OTel toggle on the create-package-policy page. Switching swaps the
// form for the other schema's child package (the route is keyed by pkgkey, so the form remounts).

import React from 'react';
import { EuiButtonGroup, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';

import { getSchemaLabel } from '../../../../../../../common/services';
import { useRootPackage } from '../../../../../../hooks/use_root_package';
import type { RootSchemaOption } from '../../../../../../hooks/use_root_package';
import { useLink, useStartServices } from '../../../../../../hooks';
import { INTEGRATIONS_PLUGIN_ID } from '../../../../../../constants';

export const getRootChildVersion = (option: RootSchemaOption) =>
  option.child?.installationInfo?.version ?? option.child?.version;

/** Builds the integrations-app path to the create page for a schema's child package. */
export const useRootSchemaPath = () => {
  const { getPath } = useLink();
  return (rootName: string, option: RootSchemaOption, agentPolicyId?: string) => {
    const version = getRootChildVersion(option);
    if (!version) return undefined;
    return getPath('add_integration_to_policy', {
      pkgkey: `${option.packageName}-${version}`,
      root: rootName,
      ...(agentPolicyId ? { agentPolicyId } : {}),
      ...(option.child?.release !== 'ga' ? { prerelease: true } : {}),
    });
  };
};

export const RootSchemaToggle: React.FC<{ rootName: string; currentPackageName?: string }> = ({
  rootName,
  currentPackageName,
}) => {
  const { application } = useStartServices();
  const { options, defaultSchema } = useRootPackage(rootName);
  const getSchemaPath = useRootSchemaPath();

  if (options.length < 2) return null;

  const selected = options.find((o) => o.packageName === currentPackageName)?.schema;

  const onChange = (schema: string) => {
    const option = options.find((o) => o.schema === schema);
    if (!option || schema === selected) return;
    const agentPolicyId = new URLSearchParams(window.location.search).get('policyId') ?? undefined;
    const path = getSchemaPath(rootName, option, agentPolicyId);
    if (path) application.navigateToApp(INTEGRATIONS_PLUGIN_ID, { path, replace: true });
  };

  return (
    <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiText size="s">
          <strong>Data schema</strong>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonGroup
          legend="Data schema"
          data-test-subj="rootSchemaToggle"
          idSelected={selected ?? ''}
          onChange={onChange}
          buttonSize="compressed"
          // Default (recommended) schema first
          options={[...options]
            .sort((a, b) => Number(b.schema === defaultSchema) - Number(a.schema === defaultSchema))
            .map((o) => ({
              id: o.schema,
              label: `${getSchemaLabel(o.schema)}${
                o.schema === defaultSchema ? ' (recommended)' : ''
              }`,
              isDisabled: !o.child,
              'data-test-subj': `rootSchemaToggle-${o.schema}`,
            }))}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
