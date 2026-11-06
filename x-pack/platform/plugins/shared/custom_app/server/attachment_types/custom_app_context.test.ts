/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AUTHORING_GUIDE_EXAMPLE } from '../../common/authoring_guide';
import { CUSTOM_APP_CONTEXT_ATTACHMENT_TYPE } from '../../common/app_context_attachment';
import { UPDATE_CUSTOM_APP_TOOL_ID } from '../tools/update_custom_app_tool';
import { createCustomAppContextAttachmentType } from './custom_app_context';

const data = (overrides: Record<string, unknown> = {}) => ({
  embeddable_id: 'panel-1',
  panel_title: 'Service health',
  document: AUTHORING_GUIDE_EXAMPLE,
  ...overrides,
});

describe('the custom app attachment type', () => {
  const type = createCustomAppContextAttachmentType();

  it('has the id the allowlist knows it by, and cannot be edited by the user', () => {
    expect(type.id).toBe(CUSTOM_APP_CONTEXT_ATTACHMENT_TYPE);
    expect(type.id).toBe('platform.custom_app.app_context');
    expect(type.isReadonly).toBe(true);
  });

  describe('validate', () => {
    it('accepts the app of a panel', () => {
      expect(type.validate(data())).toMatchObject({ valid: true });
    });

    it('refuses what is not an app, with a reason', () => {
      expect(
        type.validate(data({ document: { root: { type: 'carousel', id: 'x' } } }))
      ).toMatchObject({
        valid: false,
        error: expect.any(String),
      });
      expect(type.validate(data({ embeddable_id: '' }))).toMatchObject({ valid: false });
      expect(type.validate('nonsense')).toMatchObject({ valid: false });
    });

    it('refuses an app that is well shaped but not valid across, so the agent never starts from a broken one', () => {
      expect(
        type.validate(
          data({
            document: { root: { type: 'search', id: 'find', label: 'Find', bind: 'missing' } },
          })
        )
      ).toMatchObject({ valid: false });
    });
  });

  describe('what the agent is shown', () => {
    const represent = async (value: Record<string, unknown>) =>
      (
        await type.format(
          { data: value } as never,
          {
            request: {} as never,
            spaceId: 'default',
          } as never
        )
      ).getRepresentation?.();

    it('names the panel and gives its id, so the agent can pass it back to the tool', async () => {
      const shown = await represent(data());

      expect(shown).toMatchObject({ type: 'text' });
      expect((shown as { value: string }).value).toContain('embeddable_id: panel-1');
      expect((shown as { value: string }).value).toContain('"Service health"');
    });

    it('gives the whole app as JSON the agent can start from', async () => {
      const { value } = (await represent(data())) as { value: string };
      const json = value.slice(value.indexOf('```json') + 7, value.lastIndexOf('```'));

      expect(JSON.parse(json)).toEqual(JSON.parse(JSON.stringify(AUTHORING_GUIDE_EXAMPLE)));
    });

    it('copes with a panel that has no title', async () => {
      const { value } = (await represent(data({ panel_title: undefined }))) as { value: string };

      expect(value).toMatch(/^Custom app \(embeddable_id: panel-1\):/);
    });

    it('allows room for a long app, so it is never cut off into invalid JSON', () => {
      expect(type.maxContentLength).toBeGreaterThanOrEqual(100_000);
    });
  });

  describe('what the agent is told', () => {
    it('is pointed at the tool, and told to render the result', () => {
      const description = type.getAgentDescription?.() ?? '';

      expect(description).toContain(UPDATE_CUSTOM_APP_TOOL_ID);
      expect(description).toContain('render_attachment');
      expect(description).toContain('COMPLETE app');
    });

    it('is taught how apps work', () => {
      const description = type.getAgentDescription?.() ?? '';

      expect(description).toContain('onRowClick');
      expect(description).toContain('?name');
    });

    it('makes the update tool available while an app is in the conversation, and no other', () => {
      expect(type.getTools?.()).toEqual([UPDATE_CUSTOM_APP_TOOL_ID]);
    });
  });
});
