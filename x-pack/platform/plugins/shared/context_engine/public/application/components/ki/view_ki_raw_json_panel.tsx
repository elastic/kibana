/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCodeBlock, EuiLoadingSpinner } from '@elastic/eui';
import React, { useMemo } from 'react';
import type { KiDocument } from '../../../../common/http_api/knowledge_indicators';

interface ViewKiRawJsonPanelProps {
  document?: KiDocument;
  isLoading?: boolean;
}

export const ViewKiRawJsonPanel = ({ document, isLoading = false }: ViewKiRawJsonPanelProps) => {
  const json = useMemo(() => {
    return document ? JSON.stringify(document, null, 2) : '';
  }, [document]);

  if (isLoading) {
    return <EuiLoadingSpinner size="m" data-test-subj="contextViewKiRawJsonLoading" />;
  }

  return (
    <EuiCodeBlock
      language="json"
      fontSize="m"
      paddingSize="m"
      lineNumbers
      isCopyable
      whiteSpace="pre-wrap"
      data-test-subj="contextViewKiRawJsonPanel"
    >
      {json}
    </EuiCodeBlock>
  );
};
