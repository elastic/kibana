/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiPageTemplate } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '../../hooks/use_kibana';

interface StreamNotFoundPromptProps {
  streamName: string;
}

export function StreamNotFoundPrompt({ streamName }: StreamNotFoundPromptProps) {
  const {
    core: {
      application: { navigateToApp },
    },
  } = useKibana();

  const handleGoBack = () => {
    navigateToApp('streams', { path: '/' });
  };

  return (
    <EuiPageTemplate.EmptyPrompt
      data-test-subj="streamNotFoundPrompt"
      color="subdued"
      iconType="search"
      title={
        <h2>
          {i18n.translate('xpack.streams.streamNotFound.title', {
            defaultMessage: 'Stream not found',
          })}
        </h2>
      }
      body={
        <p>
          <FormattedMessage
            id="xpack.streams.streamNotFound.description"
            defaultMessage="The stream {streamName} does not exist."
            values={{ streamName }}
          />
        </p>
      }
      actions={
        <EuiButton
          data-test-subj="streamNotFoundBackButton"
          color="primary"
          fill
          onClick={handleGoBack}
        >
          {i18n.translate('xpack.streams.streamNotFound.backButton', {
            defaultMessage: 'Back to Streams',
          })}
        </EuiButton>
      }
    />
  );
}
