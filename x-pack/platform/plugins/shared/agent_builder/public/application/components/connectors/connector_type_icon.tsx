/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import { EuiIcon, EuiSkeletonCircle } from '@elastic/eui';
import { useKibana } from '../../hooks/use_kibana';

interface ConnectorTypeIconProps {
  actionTypeId: string;
}

export const ConnectorTypeIcon: React.FC<ConnectorTypeIconProps> = ({ actionTypeId }) => {
  const {
    services: {
      plugins: { triggersActionsUi },
    },
  } = useKibana();

  const { actionTypeRegistry } = triggersActionsUi;

  const iconClass = actionTypeRegistry.has(actionTypeId)
    ? actionTypeRegistry.get(actionTypeId).iconClass
    : 'plugs';

  return (
    <Suspense fallback={<EuiSkeletonCircle size="m" />}>
      <EuiIcon type={iconClass} size="m" aria-hidden={true} />
    </Suspense>
  );
};
