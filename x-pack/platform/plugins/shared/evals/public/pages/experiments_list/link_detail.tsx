/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink, EuiText } from '@elastic/eui';

export interface LinkDetailProps {
  label: string;
  href: string;
  text: string;
  dataTestSubj?: string;
}

export const LinkDetail: React.FC<LinkDetailProps> = ({ label, href, text, dataTestSubj }) => (
  <div>
    <EuiText size="xs" color="subdued">
      {label}
    </EuiText>
    <EuiLink
      href={href}
      target="_blank"
      external
      onClick={(event: React.MouseEvent) => event.stopPropagation()}
      data-test-subj={dataTestSubj}
    >
      {text}
    </EuiLink>
  </div>
);
