/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiPanel, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

/**
 * Shown on the Code Intelligence surface when no Semantic Code Search code
 * indices exist in the cluster. Explains that ingesting code via SCS enables
 * code-derived knowledge indicators.
 */
export function CodeIntelligencePlaceholder() {
  return (
    <EuiPanel hasBorder={false} hasShadow={true}>
      <EuiEmptyPrompt
        iconType="editorCodeBlock"
        title={<h3>{TITLE}</h3>}
        body={
          <EuiText size="s">
            <p>
              <FormattedMessage
                id="xpack.streams.codeIntelligence.placeholder.body"
                defaultMessage="Code Intelligence derives knowledge indicators — repository type, language, service name, and predictive queries — directly from your source code. To enable it, ingest this service's code into Elasticsearch with {scs}."
                values={{ scs: <strong>Semantic Code Search</strong> }}
              />
            </p>
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

const HINT = i18n.translate('xpack.streams.codeIntelligence.placeholder.hint', {
  defaultMessage:
    'Once code indices are available in the cluster, code-derived knowledge indicators will appear here automatically.',
});
