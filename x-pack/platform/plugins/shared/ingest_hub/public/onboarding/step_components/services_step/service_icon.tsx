/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon, EuiSkeletonRectangle } from '@elastic/eui';
import { useGetPackageInfoByKeyQuery } from '@kbn/fleet-plugin/public';

import { ELASTIC_PACKAGE_REGISTRY_URL } from '../../../../common/constants';
import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';

const ICON_SIZE = 24;

interface ServiceIconProps {
  service: AwsServiceMatrixEntry;
}

export const ServiceIcon: React.FC<ServiceIconProps> = ({ service }) => {
  const { data, isLoading } = useGetPackageInfoByKeyQuery(service.packageName);

  if (isLoading) {
    return <EuiSkeletonRectangle width="16px" height="16px" borderRadius="s" />;
  }

  const packageInfo = data?.item;

  // Tier 1: icon from the matching policy template (RegistryImage, always has path at runtime)
  const policyTemplateIcon = packageInfo?.policy_templates?.find(
    (pt) => pt.name === service.policyTemplate
  )?.icons?.[0] as { path?: string } | undefined;

  // Tier 2: package-level icon (PackageSpecIcon from manifest, path present at runtime)
  const packageIcon = packageInfo?.icons?.[0] as { path?: string } | undefined;

  const iconPath = policyTemplateIcon?.path ?? packageIcon?.path;

  if (iconPath) {
    return (
      <img
        src={ELASTIC_PACKAGE_REGISTRY_URL + iconPath}
        width={ICON_SIZE}
        height={ICON_SIZE}
        alt=""
        aria-hidden={true}
        style={{ flexShrink: 0 }}
      />
    );
  }

  // Tier 3: generic AWS logo
  return <EuiIcon type="logoAWS" size="l" aria-hidden={true} />;
};
