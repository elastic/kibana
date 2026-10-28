/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon, EuiSkeletonRectangle } from '@elastic/eui';
import { useGetPackageInfoByKeyQuery } from '@kbn/fleet-plugin/public';
import { epmRouteService } from '@kbn/fleet-plugin/common';

import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';

import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';

const ICON_SIZE = 24;

interface ServiceIconProps {
  service: AwsServiceMatrixEntry;
}

export const ServiceIcon: React.FC<ServiceIconProps> = ({ service }) => {
  const { services } = useKibana<CoreStart>();
  const { data, isLoading } = useGetPackageInfoByKeyQuery(service.packageName);

  if (isLoading) {
    return (
      <EuiSkeletonRectangle width={`${ICON_SIZE}px`} height={`${ICON_SIZE}px`} borderRadius="s" />
    );
  }

  const packageInfo = data?.item;

  // Tier 1: icon from the matching policy template.
  // OTel twins alias an ECS policy template via policyTemplate — use that name for lookup.
  const policyTemplateIcon = packageInfo?.policy_templates
    ?.find((pt) => pt.name === (service.policyTemplate ?? service.id))
    ?.icons?.find((icon) => icon.type === 'image/svg+xml');

  // Tier 2: package-level icon
  const packageIcon = packageInfo?.icons?.find((icon) => icon.type === 'image/svg+xml');

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
