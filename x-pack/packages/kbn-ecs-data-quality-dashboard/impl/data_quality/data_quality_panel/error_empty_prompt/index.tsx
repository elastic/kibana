/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiText } from '@elastic/eui';
import React, { useMemo } from 'react';

interface Props {
  error: string;
  title: string;
}

const ErrorEmptyPromptComponent: React.FC<Props> = ({ error, title }) => {
  const body = useMemo(() => <EuiText size="xs">{error}</EuiText>, [error]);
  const errorTitle = useMemo(() => <h2>{title}</h2>, [title]);

  return (
    <EuiEmptyPrompt
      body={body}
      color="danger"
      layout="vertical"
      paddingSize="s"
      title={errorTitle}
      titleSize="xxs"
    />
  );
};
ErrorEmptyPromptComponent.displayName = 'ErrorEmptyPromptComponent';

export const ErrorEmptyPrompt = React.memo(ErrorEmptyPromptComponent);
