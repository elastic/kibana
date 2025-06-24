/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge } from '@elastic/eui';
import React from 'react';

export const BadgesColumn: React.FC<{
  items: string[] | null | undefined;
  prefix: string;
  color?: string;
}> = React.memo(({ items, prefix, color = 'hollow' }) =>
  items && items.length > 0 ? (
    <div>
      {items.map((title, idx) => (
        <EuiBadge key={`${prefix}-${idx}`} color={color}>
          {title}
        </EuiBadge>
      ))}
    </div>
  ) : null
);
BadgesColumn.displayName = 'BadgesColumn';
