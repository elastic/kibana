/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import * as i18n from './translations';

export const NewAttachmentsBadge = React.memo<{ count: number }>(({ count }) =>
  count > 0 ? (
    <EuiBadge
      color="primary"
      css={{ marginInlineStart: 4 }}
      aria-label={i18n.NEW_ATTACHMENTS_ARIA(count)}
      data-test-subj="case-view-tab-new-attachments-badge"
    >
      {`+${count}`}
    </EuiBadge>
  ) : null
);
NewAttachmentsBadge.displayName = 'NewAttachmentsBadge';
