/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import moment from 'moment-timezone';
import {
  ConversationActivityEventType,
  EventActorType,
  type ConversationEvent,
} from '@kbn/agent-builder-common';
import { ActivityLogRow } from './activity_log_row';
import { toActivityItems } from './to_activity_items';

const createdEvent: ConversationEvent = {
  id: 'event-1',
  type: ConversationActivityEventType.conversationCreated,
  data: { agent_id: 'agent', access_mode: 'private' },
  created_at: '2026-06-01T10:00:00Z',
  actor: { type: EventActorType.user, id: 'alex' },
};

const renderRow = () => {
  const [event] = toActivityItems([createdEvent]);

  return render(
    <IntlProvider locale="en">
      <EuiThemeProvider>
        <ActivityLogRow event={event} actorLabel="Alex Kim" profiles={new Map()} />
      </EuiThemeProvider>
    </IntlProvider>
  );
};

describe('ActivityLogRow timestamp', () => {
  afterEach(() => {
    moment.tz.setDefault();
  });

  it('shows the date and the 24-hour time', () => {
    moment.tz.setDefault('UTC');

    expect(renderRow().container).toHaveTextContent('Jun 01, 2026 at 10:00');
  });

  it('uses the default timezone that core configures for moment', () => {
    moment.tz.setDefault('Asia/Tokyo');

    expect(renderRow().container).toHaveTextContent('Jun 01, 2026 at 19:00');
  });

  it('shows midnight as 00:xx', () => {
    moment.tz.setDefault('UTC');
    const [event] = toActivityItems([{ ...createdEvent, created_at: '2026-06-01T00:05:00Z' }]);

    const { container } = render(
      <IntlProvider locale="en">
        <EuiThemeProvider>
          <ActivityLogRow event={event} actorLabel="Alex Kim" profiles={new Map()} />
        </EuiThemeProvider>
      </IntlProvider>
    );

    expect(container).toHaveTextContent('Jun 01, 2026 at 00:05');
  });
});
