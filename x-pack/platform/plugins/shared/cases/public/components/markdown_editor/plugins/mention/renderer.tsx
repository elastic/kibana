/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiBadge } from '@elastic/eui';

interface MentionRendererProps {
  name: string;
  uid: string;
}

const MentionRendererComponent: React.FC<MentionRendererProps> = ({ name, uid }) => (
  <EuiBadge color="hollow" data-test-subj={`comment-mention-${uid}`}>
    {`@${name}`}
  </EuiBadge>
);

MentionRendererComponent.displayName = 'MentionRenderer';

export const MentionRenderer = memo(MentionRendererComponent);
