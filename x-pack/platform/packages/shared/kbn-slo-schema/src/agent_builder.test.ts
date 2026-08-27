/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isLeft, isRight } from 'fp-ts/Either';
import {
  SLO_AGENT_TOOL_IDS,
  SLO_DEFINITION_ATTACHMENT_TYPE_ID,
  SLO_MANAGEMENT_SKILL_ID,
  sloDefinitionAttachmentDataSchema,
} from './agent_builder';

const ID_REGEX =
  /^(?:[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?)(?:\.(?:[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?))*$/;

const minimalIndicator = {
  type: 'sli.kql.custom',
  params: {
    index: 'logs-*',
    good: 'response.status: 200',
    total: '*',
    timestampField: '@timestamp',
  },
};

const minimalDraft = {
  name: 'My SLO',
  description: 'A draft SLO',
  indicator: minimalIndicator,
  timeWindow: { duration: '30d', type: 'rolling' },
  budgetingMethod: 'occurrences',
  objective: { target: 0.99 },
};

describe('sloDefinitionAttachmentDataSchema', () => {
  it('decodes a minimal draft (required fields only)', () => {
    const result = sloDefinitionAttachmentDataSchema.decode(minimalDraft);
    expect(isRight(result)).toBe(true);
  });

  it('decodes a full saved-SLO shape', () => {
    const full = {
      ...minimalDraft,
      id: 'abc12345-abcd-1234-abcd-abcd12345678',
      revision: 1,
      enabled: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
      version: 2,
      tags: ['prod', 'api'],
      groupBy: 'host.name',
      settings: {
        syncDelay: '1m',
        frequency: '1m',
        preventInitialBackfill: false,
      },
    };
    const result = sloDefinitionAttachmentDataSchema.decode(full);
    expect(isRight(result)).toBe(true);
  });

  it('decodes Left when indicator is missing', () => {
    const { indicator: _omit, ...withoutIndicator } = minimalDraft;
    const result = sloDefinitionAttachmentDataSchema.decode(withoutIndicator);
    expect(isLeft(result)).toBe(true);
  });
});

describe('agent-builder id constants', () => {
  it('SLO_MANAGEMENT_SKILL_ID matches id regex and is ≤ 64 chars', () => {
    expect(ID_REGEX.test(SLO_MANAGEMENT_SKILL_ID)).toBe(true);
    expect(SLO_MANAGEMENT_SKILL_ID.length).toBeLessThanOrEqual(64);
  });

  it('SLO_DEFINITION_ATTACHMENT_TYPE_ID matches id regex and is ≤ 64 chars', () => {
    expect(ID_REGEX.test(SLO_DEFINITION_ATTACHMENT_TYPE_ID)).toBe(true);
    expect(SLO_DEFINITION_ATTACHMENT_TYPE_ID.length).toBeLessThanOrEqual(64);
  });

  it('all SLO_AGENT_TOOL_IDS match id regex and are ≤ 64 chars', () => {
    for (const id of Object.values(SLO_AGENT_TOOL_IDS)) {
      expect(ID_REGEX.test(id)).toBe(true);
      expect(id.length).toBeLessThanOrEqual(64);
    }
  });
});
