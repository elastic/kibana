/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import type { EuiSkeletonCircleProps, IconSize, IconType } from '@elastic/eui';
import { EuiIcon, EuiSkeletonCircle } from '@elastic/eui';
import { ConnectorIconsMap } from '@kbn/connector-specs/icons';
import { useKibana } from '../../hooks/use_kibana';

export interface ConnectorTypeIconProps {
  actionTypeId: string;
  size?: IconSize;
}

const toSkeletonSize = (size: IconSize): EuiSkeletonCircleProps['size'] => {
  if (size === 'original') return 'm';
  if (size === 'xxl') return 'xl';
  return size;
};

export const ConnectorTypeIcon: React.FC<ConnectorTypeIconProps> = ({
  actionTypeId,
  size = 'm',
}) => {
  const {
    services: {
      plugins: { triggersActionsUi },
    },
  } = useKibana();

  const { actionTypeRegistry } = triggersActionsUi;

  const iconType: IconType =
    ConnectorIconsMap.get(actionTypeId) ?? // v2 connector icons
    (actionTypeRegistry.has(actionTypeId)
      ? actionTypeRegistry.get(actionTypeId).iconClass // legacy connector icons
      : 'plugs');

  return (
    <Suspense fallback={<EuiSkeletonCircle size={toSkeletonSize(size)} />}>
      <EuiIcon type={iconType} size={size} aria-hidden={true} />
    </Suspense>
  );
};
