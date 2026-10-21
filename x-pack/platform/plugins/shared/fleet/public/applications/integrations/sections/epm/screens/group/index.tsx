/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// PROTOTYPE: integration group page. Every group (package with `schemas`) gets the generic
// onboarding wizard, driven by its child integrations' package metadata. No per-group code.
// The create-package-policy page keeps its `?group=<name>` schema toggle for direct links.

import React from 'react';
import { useParams } from 'react-router-dom';
import { EuiCallOut, EuiSkeletonText } from '@elastic/eui';

import { useGroupPackage } from '../../../../../../hooks/use_group_package';

import { GroupOnboardingWizard } from './group_wizard';

export { GroupSchemaToggle } from './schema_toggle';

export const GroupPackagePage: React.FC = () => {
  const { groupName } = useParams<{ groupName: string }>();
  const { group, options, defaultSchema, isLoading } = useGroupPackage(groupName);

  if (isLoading) return <EuiSkeletonText lines={6} />;
  if (group && options.some((o) => o.child)) {
    return (
      <GroupOnboardingWizard
        group={group}
        // Schemas whose child isn't in the registry can't be offered.
        options={options.filter((o) => o.child)}
        defaultSchema={defaultSchema}
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
