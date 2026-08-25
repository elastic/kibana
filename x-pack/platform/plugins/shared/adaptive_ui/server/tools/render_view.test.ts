/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { ATTACHMENT_REF_ACTOR } from '@kbn/agent-builder-common/attachments';
import { ADAPTIVE_UI_VIEW_ATTACHMENT_TYPE, adaptiveUiTools } from '../../common/constants';
import { renderViewTool } from './render_view';

type Handler = ReturnType<typeof renderViewTool>['handler'];

const createContext = (add = jest.fn()) =>
  ({
    attachments: { add },
    logger: { debug: jest.fn(), error: jest.fn() },
  } as unknown as Parameters<Handler>[1]);

const validSpec = {
  type: 'view',
  title: 'Status',
  body: [{ type: 'text', body: 'All good.' }],
};

describe('renderViewTool', () => {
  it('has the expected id and builtin type', () => {
    const tool = renderViewTool();
    expect(tool.id).toBe(adaptiveUiTools.renderView);
  });

  it('persists a valid spec as an attachment and returns its id', async () => {
    const add = jest.fn().mockResolvedValue({ id: 'att-1', current_version: 1 });
    const tool = renderViewTool();

    const result = await tool.handler({ spec: validSpec }, createContext(add));

    expect(add).toHaveBeenCalledWith(
      expect.objectContaining({ type: ADAPTIVE_UI_VIEW_ATTACHMENT_TYPE, data: validSpec }),
      ATTACHMENT_REF_ACTOR.agent
    );
    expect('results' in result && result.results[0]).toMatchObject({
      type: ToolResultType.other,
      data: { attachment_id: 'att-1', version: 1, title: 'Status' },
    });
  });

  it('applies the title override into the persisted spec', async () => {
    const add = jest.fn().mockResolvedValue({ id: 'att-2', current_version: 1 });
    const tool = renderViewTool();

    await tool.handler({ spec: validSpec, title: 'Renamed' }, createContext(add));

    expect(add).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ title: 'Renamed' }) }),
      ATTACHMENT_REF_ACTOR.agent
    );
  });

  it('returns an error result and does not persist when the spec is invalid', async () => {
    const add = jest.fn();
    const tool = renderViewTool();

    const result = await tool.handler({ spec: { nonsense: true } }, createContext(add));

    expect(add).not.toHaveBeenCalled();
    expect('results' in result && result.results[0].type).toBe(ToolResultType.error);
  });
});
