/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiCallOut, EuiEmptyPrompt, EuiPanel, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

/** Shows the setup path when the Code Intelligence agent is not installed. */
export function CodeIntelligencePlaceholder({ message }: { message?: string }): React.ReactElement {
  return (
    <div data-test-subj="codeIntelligenceTab">
      <EuiPanel hasBorder={false} hasShadow={true} data-test-subj="codeIntelligencePlaceholder">
        <EuiEmptyPrompt
          iconType="editorCodeBlock"
          title={<h3>{TITLE}</h3>}
          body={
            <EuiText size="s">
              <p>
                <FormattedMessage
                  id="xpack.significantEventsApp.codeIntelligence.placeholderDescription"
                  defaultMessage="Code Intelligence derives knowledge indicators — repository type, language, service name, and predictive queries — directly from source code. To enable it, install the {sourcerer} agent, configure a Knowledge Indicator extraction connector, and index the repositories to analyze."
                  values={{ sourcerer: <strong>Sourcerer</strong> }}
                />
              </p>
              {message ? <p>{message}</p> : <p>{HINT}</p>}
            </EuiText>
          }
        />
      </EuiPanel>
    </div>
  );
}

export function CodeIntelligenceAvailabilityError({
  onRetry,
}: {
  onRetry: () => void;
}): React.ReactElement {
  return (
    <EuiCallOut
      color="danger"
      iconType="error"
      title={AVAILABILITY_ERROR_TITLE}
      data-test-subj="codeIntelligenceAvailabilityError"
    >
      <p>{AVAILABILITY_ERROR_BODY}</p>
      <EuiButton size="s" onClick={onRetry}>
        {RETRY_BUTTON_LABEL}
      </EuiButton>
    </EuiCallOut>
  );
}

const TITLE = i18n.translate('xpack.significantEventsApp.codeIntelligence.placeholderTitle', {
  defaultMessage: 'Enable Code Intelligence',
});

const HINT = i18n.translate('xpack.significantEventsApp.codeIntelligence.placeholderHint', {
  defaultMessage:
    'Once the Sourcerer agent, extraction connector, and indexed repository are available, code-derived knowledge indicators will appear here automatically.',
});

const AVAILABILITY_ERROR_TITLE = i18n.translate(
  'xpack.significantEventsApp.codeIntelligence.availabilityErrorTitle',
  { defaultMessage: 'Could not check Code Intelligence availability' }
);

const AVAILABILITY_ERROR_BODY = i18n.translate(
  'xpack.significantEventsApp.codeIntelligence.availabilityErrorDescription',
  { defaultMessage: 'Retry to check whether Code Intelligence is ready to use.' }
);

const RETRY_BUTTON_LABEL = i18n.translate(
  'xpack.significantEventsApp.codeIntelligence.availabilityRetryButtonLabel',
  { defaultMessage: 'Retry' }
);
