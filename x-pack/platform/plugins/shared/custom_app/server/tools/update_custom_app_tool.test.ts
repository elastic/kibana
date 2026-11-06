/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { ATTACHMENT_REF_ACTOR } from '@kbn/agent-builder-common/attachments';
import { AUTHORING_GUIDE_EXAMPLE } from '../../common/authoring_guide';
import { CUSTOM_APP_CONTEXT_ATTACHMENT_TYPE } from '../../common/app_context_attachment';
import { CUSTOM_APP_UPDATED_UI_EVENT } from '../../common/ui_events';
import { customAppUpdateSchema } from '../../common/update_app_schema';
import { createUpdateCustomAppTool, UPDATE_CUSTOM_APP_TOOL_ID } from './update_custom_app_tool';

const CURRENT = {
  embeddable_id: 'panel-1',
  panel_title: 'Service health',
  document: { state: {}, root: { type: 'heading', id: 'title', text: 'Before' } },
};

const attachment = (data: unknown, id = 'att-1') => ({
  id,
  type: CUSTOM_APP_CONTEXT_ATTACHMENT_TYPE,
  current_version: 1,
  versions: [{ version: 1, data }],
});

const makeContext = (
  attached: Array<ReturnType<typeof attachment>>,
  updated: unknown = { current_version: 2 }
) => {
  const update = jest.fn().mockResolvedValue(updated);
  const sendUiEvent = jest.fn();
  return {
    attachments: { getAll: jest.fn().mockReturnValue(attached), update },
    events: { sendUiEvent },
    logger: { warn: jest.fn(), error: jest.fn() },
    update,
    sendUiEvent,
  };
};

/** Runs the tool the way Agent Builder does: its input schema first, then the handler. */
const call = async (
  input: { embeddable_id?: string; attachment_id?: string; document: unknown },
  attached = [attachment(CURRENT)],
  updated?: unknown
) => {
  const tool = createUpdateCustomAppTool();
  const parsed = customAppUpdateSchema.parse(input);
  const context = makeContext(attached, updated);
  const ret = await tool.handler(parsed, context as unknown as Parameters<typeof tool.handler>[1]);
  if (!('results' in ret)) throw new Error('Unexpected prompt from the handler');
  return { result: ret.results[0], context, parsed };
};

const NEW_DOCUMENT = {
  state: {},
  root: { type: 'heading', id: 'title', text: 'After' },
};

describe('the update custom app tool', () => {
  describe('how it is declared', () => {
    const tool = createUpdateCustomAppTool();

    it('has the id the allowlist knows it by, and stays out of MCP, where it cannot work', () => {
      expect(tool.id).toBe(UPDATE_CUSTOM_APP_TOOL_ID);
      expect(tool.id).toBe('custom_app_update_app');
      expect(tool.excludeFromMcp).toBe(true);
    });

    it('is not read-only, since it changes an app, and is not destructive', () => {
      expect(tool.annotations).toMatchObject({ readOnlyHint: false, destructiveHint: false });
    });

    it('tells the agent what to pass, what to do on problems, and to render the result', () => {
      expect(tool.description).toContain('embeddable_id');
      expect(tool.description).toContain('COMPLETE');
      expect(tool.description).toContain('call the tool again');
      expect(tool.description).toContain('render_attachment');
    });

    it('teaches how apps work, so the agent can use the tool with only this description', () => {
      expect(tool.description).toContain('onRowClick');
      expect(tool.description).toContain('?name');
    });
  });

  describe('with no app to change', () => {
    it('says that none is attached, and what the user must do', async () => {
      const { result, context } = await call(
        { embeddable_id: 'panel-1', document: NEW_DOCUMENT },
        []
      );

      expect(result.type).toBe(ToolResultType.error);
      expect(JSON.stringify(result.data)).toContain('Generate with chat');
      expect(context.update).not.toHaveBeenCalled();
      expect(context.sendUiEvent).not.toHaveBeenCalled();
    });

    it('lists the apps that are attached when the id is not one of them', async () => {
      const { result } = await call({ embeddable_id: 'other', document: NEW_DOCUMENT }, [
        attachment(CURRENT),
        attachment({ ...CURRENT, embeddable_id: 'panel-2' }, 'att-2'),
      ]);

      expect(result.type).toBe(ToolResultType.error);
      expect(JSON.stringify(result.data)).toContain('Attached apps: panel-1, panel-2');
    });

    it('asks for an id when given neither', async () => {
      const { result, context } = await call({ document: NEW_DOCUMENT });

      expect(result.type).toBe(ToolResultType.error);
      expect(JSON.stringify(result.data)).toContain('embeddable_id or the attachment_id');
      expect(context.update).not.toHaveBeenCalled();
    });

    it('ignores attachments of another kind, and ones that are not an app', async () => {
      const { result } = await call({ embeddable_id: 'panel-1', document: NEW_DOCUMENT }, [
        { ...attachment(CURRENT), type: 'something.else' },
        attachment({ nonsense: true }, 'att-3'),
      ]);

      expect(result.type).toBe(ToolResultType.error);
      expect(JSON.stringify(result.data)).toContain('No custom app is attached');
    });
  });

  describe('with an app made in the conversation', () => {
    const { embeddable_id: _panel, ...MADE_HERE } = CURRENT;

    it('changes it by attachment id, and keeps it without a panel', async () => {
      const { result, context } = await call({ attachment_id: 'att-9', document: NEW_DOCUMENT }, [
        attachment(MADE_HERE, 'att-9'),
      ]);

      expect(result.type).toBe(ToolResultType.other);
      expect(context.update).toHaveBeenCalledWith(
        'att-9',
        { data: { panel_title: 'Service health', document: NEW_DOCUMENT } },
        ATTACHMENT_REF_ACTOR.agent
      );
    });

    it('lists it by attachment id when another id is asked for', async () => {
      const { result } = await call({ attachment_id: 'other', document: NEW_DOCUMENT }, [
        attachment(MADE_HERE, 'att-9'),
      ]);

      expect(JSON.stringify(result.data)).toContain('Attached apps: att-9');
    });
  });

  describe('with an app that is not valid', () => {
    const broken = {
      state: {},
      root: {
        type: 'stack',
        id: 'root',
        children: [
          { type: 'search', id: 'find', label: 'Find', bind: 'missing' },
          { type: 'text', id: 'dup', text: 'a' },
          { type: 'text', id: 'dup', text: 'b' },
        ],
      },
    };

    it('lists every problem, each naming its component, for the agent to fix', async () => {
      const { result } = await call({ embeddable_id: 'panel-1', document: broken });

      const message = (result.data as { message: string }).message;
      expect(result.type).toBe(ToolResultType.error);
      expect(message).toContain('The app has 2 problems. Fix them all and call the tool again:');
      expect(message).toContain('- Duplicate node id "dup"');
      expect(message).toContain('- Node "find" binds unknown state key "missing"');
    });

    it('says it in the singular for one problem', async () => {
      const { result } = await call({
        embeddable_id: 'panel-1',
        document: { root: { type: 'search', id: 'find', label: 'Find', bind: 'missing' } },
      });

      expect((result.data as { message: string }).message).toContain(
        'The app has 1 problem. Fix it and call the tool again:'
      );
    });

    it('changes nothing and tells the browser nothing', async () => {
      const { context } = await call({ embeddable_id: 'panel-1', document: broken });

      expect(context.update).not.toHaveBeenCalled();
      expect(context.sendUiEvent).not.toHaveBeenCalled();
    });

    it('accepts the corrected app on the next call', async () => {
      const { result } = await call({ embeddable_id: 'panel-1', document: NEW_DOCUMENT });

      expect(result.type).toBe(ToolResultType.other);
    });
  });

  describe('with a valid app', () => {
    it('replaces the app of the attachment, as the agent, keeping the panel id and title', async () => {
      const { context, parsed } = await call({ embeddable_id: 'panel-1', document: NEW_DOCUMENT });

      expect(context.update).toHaveBeenCalledTimes(1);
      expect(context.update).toHaveBeenCalledWith(
        'att-1',
        {
          data: {
            embeddable_id: 'panel-1',
            panel_title: 'Service health',
            document: parsed.document,
          },
        },
        ATTACHMENT_REF_ACTOR.agent
      );
    });

    it('tells the browser, once, which attachment and what the app is now', async () => {
      const { context, parsed } = await call({ embeddable_id: 'panel-1', document: NEW_DOCUMENT });

      expect(context.sendUiEvent).toHaveBeenCalledTimes(1);
      expect(context.sendUiEvent).toHaveBeenCalledWith(CUSTOM_APP_UPDATED_UI_EVENT, {
        attachmentId: 'att-1',
        data: {
          embeddable_id: 'panel-1',
          panel_title: 'Service health',
          document: parsed.document,
        },
      });
    });

    it('returns the attachment and version, so the agent can render it', async () => {
      const { result } = await call({ embeddable_id: 'panel-1', document: NEW_DOCUMENT });

      expect(result.type).toBe(ToolResultType.other);
      expect(result.data).toMatchObject({ attachment_id: 'att-1', version: 2 });
    });

    it('accepts a full app, such as the one the guide shows', async () => {
      const { result } = await call({
        embeddable_id: 'panel-1',
        document: AUTHORING_GUIDE_EXAMPLE,
      });

      expect(result.type).toBe(ToolResultType.other);
    });

    it('changes the app it is asked to when several are attached', async () => {
      const { context } = await call({ embeddable_id: 'panel-2', document: NEW_DOCUMENT }, [
        attachment(CURRENT),
        attachment({ ...CURRENT, embeddable_id: 'panel-2' }, 'att-2'),
      ]);

      expect(context.update.mock.calls[0][0]).toBe('att-2');
      expect(context.sendUiEvent.mock.calls[0][1].attachmentId).toBe('att-2');
    });

    it('copes with an app that had no title', async () => {
      const { context } = await call({ embeddable_id: 'panel-1', document: NEW_DOCUMENT }, [
        attachment({ embeddable_id: 'panel-1', document: CURRENT.document }),
      ]);

      expect(context.update.mock.calls[0][1].data).not.toHaveProperty('panel_title');
    });
  });

  describe('when the conversation cannot save it', () => {
    it('does not tell the browser, and says it was not saved', async () => {
      const { result, context } = await call(
        { embeddable_id: 'panel-1', document: NEW_DOCUMENT },
        [attachment(CURRENT)],
        // What the conversation hands back when it could not save. Not undefined, which would
        // just mean "use the default".
        null
      );

      expect(context.sendUiEvent).not.toHaveBeenCalled();
      expect((result.data as { message: string }).message).toContain('could not be saved');
    });
  });
});
