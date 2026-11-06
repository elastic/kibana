/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon, EuiSkeletonRectangle, useEuiTheme } from '@elastic/eui';
import { useGetPackageInfoByKeyQuery } from '@kbn/fleet-plugin/public';
import { epmRouteService } from '@kbn/fleet-plugin/common';
import type { PackageSpecIcon } from '@kbn/fleet-plugin/common';

import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';

import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';

const ICON_SIZE = 24;

// Packages whose package-level icon is the generic AWS wordmark. Its dark "aws" text is invisible
// on dark backgrounds, so these fall through to the theme-aware EUI logoAWS instead.
const GENERIC_AWS_ICON_PACKAGES = new Set(['aws', 'aws_logs', 'aws_billing']);

// Prefers the package's dark_mode SVG variant in dark mode; never picks it in light mode.
const findSvgIcon = (icons: PackageSpecIcon[] | undefined, isDarkMode: boolean) => {
  const svgIcons = icons?.filter((icon) => icon.type === 'image/svg+xml') ?? [];
  return (
    (isDarkMode ? svgIcons.find((icon) => icon.dark_mode) : undefined) ??
    svgIcons.find((icon) => !icon.dark_mode)
  );
};

interface ServiceIconProps {
  service: AwsServiceMatrixEntry;
}

export const ServiceIcon: React.FC<ServiceIconProps> = ({ service }) => {
  const { services } = useKibana<CoreStart>();
  const { colorMode } = useEuiTheme();
  const isDarkMode = colorMode === 'DARK';
  const { data, isLoading } = useGetPackageInfoByKeyQuery(service.packageName);

  if (isLoading) {
    return (
      <EuiSkeletonRectangle width={`${ICON_SIZE}px`} height={`${ICON_SIZE}px`} borderRadius="s" />
    );
  }

  const packageInfo = data?.item;

  // Tier 1: icon from the matching policy template.
  // OTel twins alias an ECS policy template via policyTemplate — use that name for lookup.
  const policyTemplateIcon = findSvgIcon(
    packageInfo?.policy_templates?.find((pt) => pt.name === (service.policyTemplate ?? service.id))
      ?.icons,
    isDarkMode
  );

  // Tier 2: package-level icon, unless it is the generic AWS wordmark
  const packageIcon =
    packageInfo && !GENERIC_AWS_ICON_PACKAGES.has(packageInfo.name)
      ? findSvgIcon(packageInfo.icons, isDarkMode)
      : undefined;

  const icon = policyTemplateIcon ?? packageIcon;

  if (icon && packageInfo) {
    // Use .src (relative path within the package) the same way Fleet's getEuiIconType does,
    // so epmRouteService.getFilePath builds a valid Kibana proxy URL instead of a malformed one.
    const src = services.http.basePath.prepend(
      epmRouteService.getFilePath(`/package/${packageInfo.name}/${packageInfo.version}${icon.src}`)
    );
    return (
      <img
        src={src}
        width={ICON_SIZE}
        height={ICON_SIZE}
        alt=""
        aria-hidden={true}
        loading="lazy"
        style={{ flexShrink: 0 }}
      />
    );
  }

  // Tier 3: generic AWS logo
  return <EuiIcon type="logoAWS" size="l" aria-hidden={true} />;
};
