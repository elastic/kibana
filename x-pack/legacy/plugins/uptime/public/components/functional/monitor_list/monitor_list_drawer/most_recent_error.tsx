/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiText, EuiLink } from '@elastic/eui';

interface RecentError {
  message: string;
  type: string;
}

interface MostRecentErrorProps {
  error: RecentError;
}

export const MostRecentError = ({ error }: MostRecentErrorProps) => {
  return (
    <>
      <EuiText size="xs">
        <h3>Most recent error</h3>
      </EuiText>
      <EuiLink href={error.message} target="_blank">
        {error.message}
      </EuiLink>
    </>
  );
};
