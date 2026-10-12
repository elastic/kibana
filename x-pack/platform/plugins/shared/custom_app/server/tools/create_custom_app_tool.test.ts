/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { AUTHORING_GUIDE_EXAMPLE } from '../../common/authoring_guide';
import { CUSTOM_APP_CONTEXT_ATTACHMENT_TYPE } from '../../common/app_context_attachment';
import { customAppCreateSchema } from '../../common/create_app_schema';
import { createCreateCustomAppTool } from './create_custom_app_tool';
import { CREATE_CUSTOM_APP_TOOL_ID } from './update_custom_app_tool';

const call = async (
  input: unknown,
  add = jest.fn().mockResolvedValue({ id: 'att-1', current_version: 1 })
) => {
  const tool = createCreateCustomAppTool();
  const context = { attachments: { add }, logger: { error: jest.fn() } };
  const ret = await tool.handler(
    customAppCreateSchema.parse(input),
    context as unknown as Parameters<typeof tool.handler>[1]
  );
  if (!('results' in ret)) throw new Error('Unexpected prompt from the handler');
  return { result: ret.results[0], add };
};

describe('the create custom app tool', () => {
  it('has the id the allowlist knows it by, and stays out of MCP', () => {
    const tool = createCreateCustomAppTool();

    expect(tool.id).toBe(CREATE_CUSTOM_APP_TOOL_ID);
    expect(tool.id).toBe('custom_app_create_app');
    expect(tool.excludeFromMcp).toBe(true);
    expect(tool.description).toContain('render_attachment');
    expect(tool.description).toContain('onRowClick');
  });

  it('saves a valid app as a new attachment without a panel, and returns its id', async () => {
    const { result, add } = await call({ title: 'Services', document: AUTHORING_GUIDE_EXAMPLE });

    expect(add).toHaveBeenCalledWith({
      type: CUSTOM_APP_CONTEXT_ATTACHMENT_TYPE,
      data: {
        panel_title: 'Services',
        document: customAppCreateSchema.parse({ document: AUTHORING_GUIDE_EXAMPLE }).document,
      },
      description: 'Custom app: Services',
    });
    expect(result.type).toBe(ToolResultType.other);
    expect(result.data).toMatchObject({ attachment_id: 'att-1', version: 1 });
  });

  it('returns each problem of an app that is not valid, and saves nothing', async () => {
    const broken = {
      state: {},
      root: { type: 'search', id: 'find', label: 'Find', bind: 'missing' },
    };
    const { result, add } = await call({ document: broken });

    expect(result.type).toBe(ToolResultType.error);
    expect(JSON.stringify(result.data)).toContain('call the tool again');
    expect(add).not.toHaveBeenCalled();
  });

  it('reports a failure to save instead of claiming success', async () => {
    const { result } = await call(
      { document: AUTHORING_GUIDE_EXAMPLE },
      jest.fn().mockRejectedValue(new Error('boom'))
    );

    expect(result.type).toBe(ToolResultType.error);
    expect(JSON.stringify(result.data)).toContain('boom');
  });
});
