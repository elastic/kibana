/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiLoadingSpinner } from '@elastic/eui';
import React from 'react';

interface LogCategoryDetailsLoadingContentProps {
  message: string;
}

export const LogCategoryDetailsLoadingContent: React.FC<LogCategoryDetailsLoadingContentProps> = ({
  message,
}) => {
  return <EuiEmptyPrompt icon={<EuiLoadingSpinner size="xl" />} title={<h2>{message}</h2>} />;
};
