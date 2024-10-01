/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { SyntheticEvent } from 'react';
import { EuiLink } from '@elastic/eui';

interface HostDetailsButtonProps {
  children?: React.ReactNode;
  onClick?: (e: SyntheticEvent) => void;
  title?: string;
}

export const HostDetailsButton: React.FC<HostDetailsButtonProps> = ({
  children,
  onClick,
  title,
}) => {
  return (
    <EuiLink data-test-subj="host-details-button" onClick={onClick} title={title ?? 'Host Details'}>
      {children}
    </EuiLink>
  );
};
