/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useEuiTheme, EuiIcon } from '@elastic/eui';

export function ConversationListItemLabel({
  labelText,
  isPublic,
}: {
  labelText: string;
  isPublic: boolean;
}) {
  const { euiTheme } = useEuiTheme();

  return (
    // <span> is used on purpose, using <div> will yield invalid HTML
    <span style={{ display: 'flex', alignItems: 'center', gap: euiTheme.size.s }}>
      <span style={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {labelText}
        </span>
      </span>
      {isPublic ? <EuiIcon type="users" size="m" css={{ flexShrink: 0 }} /> : null}
    </span>
  );
}
