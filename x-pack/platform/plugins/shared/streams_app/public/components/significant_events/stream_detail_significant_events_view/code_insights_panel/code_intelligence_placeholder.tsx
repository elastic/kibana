/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiPanel, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

/**
 * Shown when Agent Builder is unavailable for GitHub-backed Code Intelligence.
 */
export function CodeIntelligencePlaceholder() {
  return (
    <EuiPanel hasBorder={false} hasShadow={true}>
      <EuiEmptyPrompt
        iconType="editorCodeBlock"
        title={<h3>{TITLE}</h3>}
        body={
          <EuiText size="s">
            <p>{BODY}</p>
            <p>{HINT}</p>
          </EuiText>
        }
      />
    </EuiPanel>
  );
}

const TITLE = i18n.translate('xpack.streams.codeIntelligence.placeholder.title', {
  defaultMessage: 'Enable Code Intelligence',
});

const BODY = i18n.translate('xpack.streams.codeIntelligence.placeholder.body', {
  defaultMessage:
    'Code Intelligence requires Agent Builder to analyze configured GitHub repositories.',
});

const HINT = i18n.translate('xpack.streams.codeIntelligence.placeholder.hint', {
  defaultMessage: 'Enable Agent Builder to generate source-derived knowledge indicators.',
});
