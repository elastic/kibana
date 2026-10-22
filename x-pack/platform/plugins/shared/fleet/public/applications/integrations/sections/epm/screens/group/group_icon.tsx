/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// PROTOTYPE: an integration group has no icon of its own; it uses its `icon` member package's.

import React from 'react';

import { PackageIcon } from '../../../../../../components';
import type { IntegrationGroup } from '../../../../../../types';
import type { GroupSchemaOption } from '../../../../../../hooks/use_group_package';
import { getGroupIconPackage } from '../../../../../../hooks/use_group_package';

export const GroupIcon: React.FC<{
  group: IntegrationGroup;
  options: GroupSchemaOption[];
  size: 'm' | 'l' | 'xl';
}> = ({ group, options, size }) => {
  const pkg = getGroupIconPackage(
    group,
    options.map((o) => o.child)
  );
  return pkg ? (
    <PackageIcon packageName={pkg.name} version={pkg.version} icons={pkg.icons} size={size} />
  ) : (
    <PackageIcon packageName={group.name} version="" size={size} />
  );
};
