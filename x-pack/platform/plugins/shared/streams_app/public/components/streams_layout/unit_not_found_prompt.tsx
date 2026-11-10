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
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { StreamsAppPageTemplate } from '../streams_app_page_template';

interface UnitNotFoundPromptProps {
  unitId: string;
}

export function UnitNotFoundPrompt({ unitId }: UnitNotFoundPromptProps) {
  const router = useStreamsAppRouter();

  return (
    <StreamsAppPageTemplate.EmptyPrompt
      data-test-subj="streamsUnitNotFoundPrompt"
      iconType="magnify"
      title={
        <h2>
          {i18n.translate('xpack.streams.unitNotFound.title', {
            defaultMessage: 'Unit not found',
          })}
        </h2>
      }
      body={
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.streams.unitNotFound.body"
              defaultMessage="We could not find unit {unitId}."
              values={{ unitId: <strong>{unitId}</strong> }}
            />
          </p>
        </EuiText>
      }
      actions={
        <EuiButton data-test-subj="streamsUnitNotFoundBackButton" fill href={router.link('/v2')}>
          {i18n.translate('xpack.streams.unitNotFound.backButton', {
            defaultMessage: 'Go to Streams',
          })}
        </EuiButton>
      }
    />
  );
}
