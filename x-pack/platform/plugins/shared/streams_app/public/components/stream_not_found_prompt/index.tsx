/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { StreamsAppPageTemplate } from '../streams_app_page_template';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';

interface StreamNotFoundPromptProps {
  streamName: string;
}

export function StreamNotFoundPrompt({ streamName }: StreamNotFoundPromptProps) {
  const router = useStreamsAppRouter();

  return (
    <StreamsAppPageTemplate.EmptyPrompt
      data-test-subj="streamNotFoundPrompt"
      iconType="search"
      title={
        <h2>
          {i18n.translate('xpack.streams.streamNotFound.title', {
            defaultMessage: 'Stream not found',
          })}
        </h2>
      }
      body={
        <EuiText data-test-subj="streamNotFoundPromptBody">
          <p>
            <FormattedMessage
              id="xpack.streams.streamNotFound.body"
              defaultMessage="We could not load stream {streamName}. It may have been deleted. Open the streams list to see your streams or create this stream again."
              values={{ streamName: <strong>{streamName}</strong> }}
            />
          </p>
        </EuiText>
      }
      actions={
        <EuiButton data-test-subj="streamNotFoundBackButton" fill href={router.link('/')}>
          {i18n.translate('xpack.streams.streamNotFound.backButton', {
            defaultMessage: 'Go to streams list',
          })}
        </EuiButton>
      }
    />
  );
}
