/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EventActorType } from '@kbn/agent-builder-common';
import { toRoundAuthor } from './user_message_event';

describe('toRoundAuthor', () => {
  it('keeps a service account principal type so the header can label it', () => {
    expect(
      toRoundAuthor({
        type: EventActorType.user,
        id: 'service_account:kibana/alertzero_alert_triage',
        username: 'kibana/alertzero_alert_triage',
        principal_type: 'service_account',
      })
    ).toEqual({
      id: 'service_account:kibana/alertzero_alert_triage',
      username: 'kibana/alertzero_alert_triage',
      type: 'service_account',
    });
  });

  it('omits type for a person', () => {
    expect(
      toRoundAuthor({
        type: EventActorType.user,
        id: 'user-1',
        username: 'alice',
        full_name: 'Alice',
      })
    ).toEqual({
      id: 'user-1',
      username: 'alice',
      full_name: 'Alice',
    });
  });
});
