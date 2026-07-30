/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon } from '@elastic/eui';
import type { IconSize } from '@elastic/eui';
import { ConnectorIconsMap } from '@kbn/connector-specs/icons';
import React, { Suspense } from 'react';

export interface ConnectorTypeIconProps {
  actionTypeId?: string;
  size?: IconSize;
}

export const ConnectorTypeIcon = ({ actionTypeId, size = 'm' }: ConnectorTypeIconProps) => {
  const LazyIcon = actionTypeId ? ConnectorIconsMap.get(actionTypeId) : null;

  if (LazyIcon) {
    return (
      <Suspense fallback={<EuiIcon type="plugs" size={size} aria-hidden={true} />}>
        <LazyIcon size={size} />
      </Suspense>
    );
  }

  return <EuiIcon type="plugs" size={size} aria-hidden={true} />;
};
