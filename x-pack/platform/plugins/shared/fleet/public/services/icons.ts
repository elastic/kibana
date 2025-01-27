/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ICON_TYPES } from '@elastic/eui';
import type { IBasePath } from '@kbn/core/public';

import { epmRouteService } from '../applications/fleet/services';
import type { PackageListItem, RegistryPolicyTemplate } from '../types';

export const getEuiIconType = (
  pkg: PackageListItem,
  basePath: IBasePath,
  policyTemplate?: RegistryPolicyTemplate
): string | undefined => {
  const pkgIcon = (policyTemplate || pkg).icons?.find((icon) => icon.type === 'image/svg+xml');
  if (!pkgIcon) {
    // If no valid SVG is available, attempt to fallback to built-in EUI icons
    return ICON_TYPES.find((key) => key.toLowerCase() === `logo${pkg.name}`);
  }

  return basePath.prepend(
    epmRouteService.getFilePath(`/package/${pkg.name}/${pkg.version}${pkgIcon.src}`)
  );
};
