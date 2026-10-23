/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// PROTOTYPE: group icon from `group.yml` (`icon`), bundled in the default member's archive. Falls
// back to the default member's own icons (groups of one: the package's icons).

import React from 'react';

import { PackageIcon } from '../../../../../../components';
import type { IntegrationGroup } from '../../../../../../types';
import type { GroupMemberOption } from '../../../../../../hooks/use_group_package';
import { getDefaultMemberOption } from '../../../../../../hooks/use_group_package';

/** PackageIcon props for a group. `integrationName` keeps the icon cache apart from the member's. */
export const getGroupIconProps = (group: IntegrationGroup, options: GroupMemberOption[]) => {
  if (group.icon) {
    const { package: packageName, version, path } = group.icon;
    return {
      packageName,
      version,
      integrationName: 'group',
      icons: [
        {
          src: `/${path.replace(/^\.?\//, '')}`,
          type: path.endsWith('.svg') ? 'image/svg+xml' : 'image/png',
        },
      ],
    };
  }
  const pkg = getDefaultMemberOption(group, options)?.child;
  return pkg
    ? { packageName: pkg.name, version: pkg.version, icons: pkg.icons }
    : { packageName: group.name, version: '' };
};

export const GroupIcon: React.FC<{
  group: IntegrationGroup;
  options: GroupMemberOption[];
  size: 'm' | 'l' | 'xl';
}> = ({ group, options, size }) => (
  <PackageIcon {...getGroupIconProps(group, options)} size={size} />
);
