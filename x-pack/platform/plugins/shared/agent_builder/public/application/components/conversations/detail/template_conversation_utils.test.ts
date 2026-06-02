/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Conversation } from '@kbn/agent-builder-common';
import {
  getTemplateFieldDefinitions,
  getTemplateHeaderActions,
  getTemplateHeaderFields,
  isCollaborativeTemplateConversation,
  shouldShowTemplateDetailShell,
} from './template_conversation_utils';

describe('template_conversation_utils', () => {
  const baseConversation: Conversation = {
    id: 'conv-1',
    agent_id: 'agent-1',
    user: { id: 'user-a', username: 'analyst_a' },
    title: 'Conversation',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    rounds: [],
  };

  describe('shouldShowTemplateDetailShell', () => {
    it('returns false for plain chats', () => {
      expect(shouldShowTemplateDetailShell(baseConversation)).toBe(false);
    });

    it('returns true when template has field definitions in the POC registry', () => {
      expect(
        shouldShowTemplateDetailShell({
          ...baseConversation,
          template_id: 'incident-triage-v2',
        })
      ).toBe(true);
    });

    it('returns true for non-case templates with field definitions', () => {
      expect(
        shouldShowTemplateDetailShell({
          ...baseConversation,
          template_id: 'research-notes-v1',
        })
      ).toBe(true);
    });

    it('returns false when custom_fields are present without a known template', () => {
      expect(
        shouldShowTemplateDetailShell({
          ...baseConversation,
          custom_fields: { severity: 'critical' },
        })
      ).toBe(false);
    });

    it('returns false for unknown template_id', () => {
      expect(
        shouldShowTemplateDetailShell({
          ...baseConversation,
          template_id: 'unknown-template',
        })
      ).toBe(false);
    });
  });

  describe('isCollaborativeTemplateConversation', () => {
    it('returns true for collaborative template snapshot', () => {
      expect(
        isCollaborativeTemplateConversation({
          template_snapshot: {
            template_id: 'incident-triage-v2',
            captured_at: '2024-01-01T00:00:00.000Z',
            chat_mode: 'collaborative',
          },
        })
      ).toBe(true);
    });

    it('returns false for personal research template snapshot', () => {
      expect(
        isCollaborativeTemplateConversation({
          template_snapshot: {
            template_id: 'research-notes-v1',
            captured_at: '2024-01-01T00:00:00.000Z',
            chat_mode: 'single',
          },
        })
      ).toBe(false);
    });
  });

  describe('getTemplateFieldDefinitions', () => {
    it('returns POC field definitions for incident template', () => {
      const definitions = getTemplateFieldDefinitions({
        template_id: 'incident-triage-v2',
      });

      expect(definitions.map((field) => field.key)).toEqual([
        'severity',
        'status',
        'mitre_technique',
        'affected_host',
      ]);
    });

    it('returns research field definitions for research template', () => {
      const definitions = getTemplateFieldDefinitions({
        template_id: 'research-notes-v1',
      });

      expect(definitions.map((field) => field.key)).toEqual([
        'topic',
        'priority',
        'summary',
        'reference_url',
      ]);
    });

    it('returns empty array for unknown template', () => {
      expect(getTemplateFieldDefinitions({ template_id: 'unknown-template' })).toEqual([]);
    });
  });

  describe('getTemplateHeaderActions', () => {
    it('returns incident-specific actions for incident template', () => {
      const actions = getTemplateHeaderActions({ template_id: 'incident-triage-v2' });

      expect(actions.map((action) => action.id)).toEqual(['run-playbook', 'push-jira']);
    });

    it('returns research-specific actions for research template', () => {
      const actions = getTemplateHeaderActions({ template_id: 'research-notes-v1' });

      expect(actions.map((action) => action.id)).toEqual(['export-notes']);
    });

    it('returns empty array for unknown template', () => {
      expect(getTemplateHeaderActions({ template_id: 'unknown-template' })).toEqual([]);
    });
  });

  describe('getTemplateHeaderFields', () => {
    it('returns only fields marked show_in_header with values', () => {
      const fields = getTemplateHeaderFields({
        template_id: 'incident-triage-v2',
        custom_fields: {
          severity: 'critical',
          status: 'open',
        },
      });

      expect(fields).toEqual([
        expect.objectContaining({
          definition: expect.objectContaining({ key: 'severity' }),
          value: 'critical',
        }),
      ]);
    });
  });
});
