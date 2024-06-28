/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge } from '@elastic/eui';
import React from 'react';

export const BadgesColumn: React.FC<{ items: string[] | null | undefined }> = React.memo(
  ({ items }) =>
    items && items.length > 0 ? (
      <div>
        {items.map((c, idx) => (
          <EuiBadge id={`${idx}`} color="hollow">
            {c}
          </EuiBadge>
        ))}
      </div>
    ) : null
);
BadgesColumn.displayName = 'BadgesColumn';
