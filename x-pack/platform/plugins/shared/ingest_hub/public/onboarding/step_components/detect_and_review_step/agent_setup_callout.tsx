/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { KbnInfoCallout } from '@kbn/ui-callout';

export function AgentSetupCallout() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <KbnInfoCallout
      title={
        <FormattedMessage
          id="xpack.ingestHub.detectAndReviewStep.agentSetupCallout.title"
          defaultMessage="Data detection depends on your agent setup"
        />
      }
      text={
        <p>
          <FormattedMessage
            id="xpack.ingestHub.detectAndReviewStep.agentSetupCallout.body"
            defaultMessage="If no Elastic Agent has been enrolled yet, you won't see incoming data on this step. This won't stop you from continuing — you can add an agent at any time from Fleet."
          />
        </p>
      }
      actionProps={{
        primary: {
          children: i18n.translate(
            'xpack.ingestHub.detectAndReviewStep.agentSetupCallout.dismiss',
            { defaultMessage: 'Dismiss' }
          ),
          onClick: () => setDismissed(true),
          'data-test-subj': 'detectAndReviewStep-agentSetupCallout-dismiss',
        },
      }}
      data-test-subj="detectAndReviewStep-agentSetupCallout"
    />
  );
}
