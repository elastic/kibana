/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { render, screen } from '@testing-library/react';
import { InboundEventsSaveToGenerateCallout } from './inbound_events_save_to_generate_callout';

describe('InboundEventsSaveToGenerateCallout', () => {
  it('tells the user to save before the webhook URL and ingest token exist', () => {
    render(<InboundEventsSaveToGenerateCallout />, { wrapper: I18nProvider });

    expect(screen.getByTestId('inbound-events-save-to-generate')).toHaveTextContent(
      'Save this connector to generate the webhook URL and ingest token.'
    );
  });
});
