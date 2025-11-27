/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCallOut } from '@elastic/eui';
import { useStreamsPrivileges } from '../../../hooks/use_streams_privileges';
import { Summary } from './summary';

export function SignificantEventsSummary() {
  const {
    features: { significantEvents },
  } = useStreamsPrivileges();

  if (!significantEvents?.available) {
    return null;
  }

  if (!significantEvents?.enabled) {
    return (
      <EuiCallOut
        announceOnMount={false}
        title={i18n.translate('xpack.streams.significantEventsSummary.enableCtaTitle', {
          defaultMessage: 'Significant events are available',
        })}
        color="accent"
        iconType="flask"
      >
        {i18n.translate('xpack.streams.significantEventsSummary.enableCtaDescription', {
          defaultMessage:
            'Significant events is a powerful feature that helps you identify key events in your data. Enable it in the Streams settings to get started.',
        })}
      </EuiCallOut>
    );
  }

  return <Summary />;
}
