/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isAllowedBuiltinAttachment } from '@kbn/agent-builder-server/allow_lists';
import { SIGNAL_INVESTIGATION_FINDINGS_ATTACHMENT_TYPE_ID } from '../common/findings_attachment';
import { createSignalInvestigationFindingsAttachmentType } from './findings_attachment';

describe('createSignalInvestigationFindingsAttachmentType', () => {
  it('registers an allow-listed attachment type that validates and formats findings', () => {
    const definition = createSignalInvestigationFindingsAttachmentType();

    expect(definition.id).toBe(SIGNAL_INVESTIGATION_FINDINGS_ATTACHMENT_TYPE_ID);
    expect(isAllowedBuiltinAttachment(definition.id)).toBe(true);
    expect(definition.getAgentDescription?.()).toContain('verified with existing tools');

    const validData = {
      seed: {
        origin: { app: 'discover' as const, surface: 'appMenu' as const },
        timeRange: { from: '2026-11-02T11:00:00.000Z', to: '2026-11-02T12:00:00.000Z' },
        filters: [],
        entities: { 'service.name': 'checkout' },
      },
      plan: [
        {
          id: 'log_rate_analysis',
          name: 'Log rate analysis',
          technique: 'Log rate analysis',
          status: 'found' as const,
          foundCount: 1,
        },
      ],
      leads: [
        {
          id: 'lead-1',
          analyzerId: 'log_rate_analysis',
          summary: 'log.level: "error" spike',
          relevance: 'Logs for service checkout',
          ranking: {
            signal: 'strong' as const,
            timing: 'during' as const,
            relationship: 'service' as const,
          },
          verdict: 'useful' as const,
        },
      ],
    };

    const validation = definition.validate(validData);
    expect(validation).toEqual({ valid: true, data: validData });

    const invalidValidation = definition.validate({ seed: {} });
    expect(invalidValidation).toEqual({
      valid: false,
      error: expect.any(String),
    });

    const formatted = definition.format(
      {
        id: 'att-1',
        type: SIGNAL_INVESTIGATION_FINDINGS_ATTACHMENT_TYPE_ID,
        data: validData,
      },
      {} as never
    );
    expect(
      formatted && 'getRepresentation' in formatted && formatted.getRepresentation?.()
    ).toEqual({
      type: 'text',
      value: expect.stringContaining('log.level: "error" spike'),
    });
  });
});
