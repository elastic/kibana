/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { matchesFilter } from './filter';

describe('matchesFilter', () => {
  const event = {
    type: 'github.pull_request.opened',
    attributes: { repo: 'elastic/kibana', team: 'response-ops' },
  };

  it('matches when the event type is subscribed to', () => {
    expect(matchesFilter({ types: [event.type] }, event)).toBe(true);
    expect(matchesFilter({ types: ['other.type', event.type] }, event)).toBe(true);
  });

  it('does not match a different event type', () => {
    expect(matchesFilter({ types: ['github.pull_request.closed'] }, event)).toBe(false);
  });

  it('matches on type alone when the filter has no attributes', () => {
    expect(matchesFilter({ types: [event.type] }, { type: event.type, attributes: {} })).toBe(true);
  });

  it('requires every filtered attribute to match', () => {
    expect(
      matchesFilter({ types: [event.type], attributes: { repo: 'elastic/kibana' } }, event)
    ).toBe(true);
    expect(
      matchesFilter(
        { types: [event.type], attributes: { repo: 'elastic/kibana', team: 'response-ops' } },
        event
      )
    ).toBe(true);
    expect(
      matchesFilter(
        { types: [event.type], attributes: { repo: 'elastic/kibana', team: 'platform' } },
        event
      )
    ).toBe(false);
  });

  it('treats an array of attribute values as membership', () => {
    expect(
      matchesFilter(
        { types: [event.type], attributes: { team: ['platform', 'response-ops'] } },
        event
      )
    ).toBe(true);
    expect(
      matchesFilter({ types: [event.type], attributes: { team: ['platform', 'security'] } }, event)
    ).toBe(false);
  });

  it('does not match when the event is missing a filtered attribute', () => {
    expect(matchesFilter({ types: [event.type], attributes: { branch: 'main' } }, event)).toBe(
      false
    );
    expect(matchesFilter({ types: [event.type], attributes: { branch: ['main'] } }, event)).toBe(
      false
    );
  });
});
