/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCodeBlock, EuiEmptyPrompt, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const emptyLabel = i18n.translate('xpack.evals.yamlPreview.empty', {
  defaultMessage: 'Complete the form to preview the generated workflow YAML.',
});

const loadingLabel = i18n.translate('xpack.evals.yamlPreview.loading', {
  defaultMessage: 'Generating workflow YAML…',
});

export interface YamlPreviewProps {
  yaml?: string;
  isLoading?: boolean;
  error?: string;
}

/**
 * Read-only, syntax-highlighted view of the workflow YAML that the server would
 * generate for the current experiment form. Used by the "Show YAML" toggle.
 */
export const YamlPreview: React.FC<YamlPreviewProps> = ({ yaml, isLoading, error }) => {
  if (error) {
    return (
      <EuiEmptyPrompt
        color="danger"
        iconType="warning"
        titleSize="xs"
        body={<EuiText size="s">{error}</EuiText>}
      />
    );
  }

  if (isLoading) {
    return (
      <EuiText size="s" color="subdued">
        <EuiLoadingSpinner size="s" /> {loadingLabel}
      </EuiText>
    );
  }

  if (!yaml) {
    return (
      <EuiText size="s" color="subdued">
        {emptyLabel}
      </EuiText>
    );
  }

  return (
    <EuiCodeBlock
      language="yaml"
      fontSize="s"
      paddingSize="m"
      isCopyable
      overflowHeight={400}
      data-test-subj="evalsYamlPreview"
    >
      {yaml}
    </EuiCodeBlock>
  );
};
