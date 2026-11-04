/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import type { EuiIconProps, EuiSkeletonCircleProps, IconType } from '@elastic/eui';
import { EuiIcon, EuiSkeletonCircle } from '@elastic/eui';

interface ConnectorIconProps {
  type: IconType;
  size?: EuiIconProps['size'];
  className?: string;
  css?: EuiIconProps['css'];
  'data-test-subj'?: string;
}

const toSkeletonSize = (size: NonNullable<EuiIconProps['size']>): EuiSkeletonCircleProps['size'] => {
  if (size === 'original') return 'm';
  if (size === 'xxl') return 'xl';
  return size;
};

export const ConnectorIcon: React.FC<ConnectorIconProps> = ({
  type,
  size = 'xl',
  className,
  css,
  'data-test-subj': dataTestSubj,
}) => (
  // EuiCard clones the icon and passes className/css for layout. Keep them on a
  // stable node so the skeleton and the loaded icon share the same box.
  <span className={className} css={css}>
    <Suspense fallback={<EuiSkeletonCircle size={toSkeletonSize(size)} />}>
      <EuiIcon type={type} size={size} aria-hidden={true} data-test-subj={dataTestSubj} />
    </Suspense>
  </span>
);
