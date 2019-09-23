/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiCallOut, EuiCodeBlock } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';

interface HasMessage {
  message: string;
}

interface OverviewPageParsingErrorCalloutProps {
  error: HasMessage;
}

export const OverviewPageParsingErrorCallout = ({
  error,
}: OverviewPageParsingErrorCalloutProps) => (
  <EuiCallOut
    title={i18n.translate('xpack.uptime.overviewPageParsingErrorCallout.title', {
      defaultMessage: 'Parsing error',
    })}
    color="danger"
    iconType="alert"
  >
    <p>
      <FormattedMessage
        id="xpack.uptime.overviewPageParsingErrorCallout.content"
        defaultMessage="There was an error parsing the filter query. {content}"
        values={{
          content: (
            <EuiCodeBlock>
              {error.message
                ? error.message
                : i18n.translate('xpack.uptime.overviewPageParsingErrorCallout.noMessage', {
                    defaultMessage: 'There was no error message',
                  })}
            </EuiCodeBlock>
          ),
        }}
      />
    </p>
  </EuiCallOut>
);
