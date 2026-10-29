/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import { EuiIcon } from '@elastic/eui';
import type { EuiIconProps } from '@elastic/eui';
import { ConnectorIconsMap } from '@kbn/connector-specs/icons';

interface ConnectorTypeIconProps {
  /** The connector type id with its leading dot, for example `.datadog`. */
  connectorTypeId?: string;
  size?: EuiIconProps['size'];
  'data-test-subj'?: string;
}

/** The logo of a connector type, or a generic plug when the type has none. */
export const ConnectorTypeIcon = ({
  connectorTypeId,
  size = 'm',
  'data-test-subj': dataTestSubj = 'importsConnectorTypeIcon',
}: ConnectorTypeIconProps) => {
  const LazyIcon = connectorTypeId ? ConnectorIconsMap.get(connectorTypeId) : undefined;

  return (
    <Suspense fallback={<EuiIcon type="empty" size={size} aria-hidden={true} />}>
      <EuiIcon
        type={LazyIcon ?? 'plugs'}
        size={size}
        aria-hidden={true}
        data-test-subj={dataTestSubj}
      />
    </Suspense>
  );
};
