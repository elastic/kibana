/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_SOLUTION_OWNER, OBSERVABILITY_OWNER } from '../../constants/owners';
import { SECURITY_EVENT_ATTACHMENT_TYPE } from '../../constants/attachments';
import { buildEventCaseAttachment } from './build_event_attachment';

describe('buildEventCaseAttachment', () => {
  describe('type resolution by owner', () => {
    it('resolves security.event for securitySolution owner', () => {
      const result = buildEventCaseAttachment(SECURITY_SOLUTION_OWNER, {
        eventId: 'event-1',
        index: 'idx-1',
      });
      expect(result.type).toBe(SECURITY_EVENT_ATTACHMENT_TYPE);
    });

    it('resolves observability.event for observability owner', () => {
      const result = buildEventCaseAttachment(OBSERVABILITY_OWNER, {
        eventId: 'event-1',
        index: 'idx-1',
      });
      expect(result.type).toBe('observability.event');
    });
  });

  describe('attachmentId and index', () => {
    it('passes through a scalar eventId and index', () => {
      const result = buildEventCaseAttachment(SECURITY_SOLUTION_OWNER, {
        eventId: 'event-1',
        index: 'idx-1',
      });
      expect(result.attachmentId).toBe('event-1');
      expect(result.metadata.index).toBe('idx-1');
    });

    it('passes through array eventId and index', () => {
      const result = buildEventCaseAttachment(SECURITY_SOLUTION_OWNER, {
        eventId: ['event-1', 'event-2'],
        index: ['idx-1', 'idx-2'],
      });
      expect(result.attachmentId).toEqual(['event-1', 'event-2']);
      expect(result.metadata.index).toEqual(['idx-1', 'idx-2']);
    });
  });

  it('does not include owner in the returned object', () => {
    const result = buildEventCaseAttachment(SECURITY_SOLUTION_OWNER, {
      eventId: 'event-1',
      index: 'idx-1',
    });
    expect(result).not.toHaveProperty('owner');
  });
});
