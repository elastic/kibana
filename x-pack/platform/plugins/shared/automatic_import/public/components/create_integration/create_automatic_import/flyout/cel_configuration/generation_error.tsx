/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiFlexItem, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import * as i18n from './translations';

interface GenerationErrorProps {
  title: string;
  error: string;
  retryAction: () => void;
}

export const GenerationError = React.memo<GenerationErrorProps>(({ title, error, retryAction }) => {
  return (
    <EuiFlexItem>
      <EuiSpacer size="s" />
      <EuiCallOut
        title={title}
        color="danger"
        iconType="alert"
        data-test-subj="generationErrorCallout"
      >
        {error}
        <EuiText size="s">
          <EuiLink onClick={retryAction}>{i18n.RETRY}</EuiLink>
        </EuiText>
      </EuiCallOut>
    </EuiFlexItem>
  );
});
GenerationError.displayName = 'GenerationError';
