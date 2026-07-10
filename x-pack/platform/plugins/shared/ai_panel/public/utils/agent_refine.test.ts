/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttachmentType } from '@kbn/agent-builder-common/attachments';
import { buildAiPanelContextAttachment, createUpdateAiPanelConfigTool } from './agent_refine';

describe('buildAiPanelContextAttachment', () => {
  it('carries the current prompt and esqlQuery as hidden screen context', () => {
    const attachment = buildAiPanelContextAttachment('Show KPI cards', 'FROM logs | STATS count()');

    expect(attachment.hidden).toBe(true);
    expect(attachment.type).toBe(AttachmentType.screenContext);
    expect(attachment.data).toMatchObject({
      additional_data: {
        panel_instructions: 'Show KPI cards',
        esql_query: 'FROM logs | STATS count()',
      },
    });
  });

  it('represents a missing esqlQuery as an empty string, not undefined', () => {
    const attachment = buildAiPanelContextAttachment('Show KPI cards', undefined);

    expect(attachment.data).toMatchObject({
      additional_data: {
        esql_query: '',
      },
    });
  });
});

describe('createUpdateAiPanelConfigTool', () => {
  it('has the expected id', () => {
    const tool = createUpdateAiPanelConfigTool(jest.fn());
    expect(tool.id).toBe('update_ai_panel_config');
  });

  it('calls onUpdate with the validated params', () => {
    const onUpdate = jest.fn();
    const tool = createUpdateAiPanelConfigTool(onUpdate);

    tool.handler({ prompt: 'new prompt' });

    expect(onUpdate).toHaveBeenCalledWith({ prompt: 'new prompt' });
  });

  it('accepts esqlQuery alone, prompt alone, or both', () => {
    const tool = createUpdateAiPanelConfigTool(jest.fn());

    expect(tool.schema.safeParse({ esqlQuery: 'FROM logs' }).success).toBe(true);
    expect(tool.schema.safeParse({ prompt: 'new prompt' }).success).toBe(true);
    expect(tool.schema.safeParse({ prompt: 'new prompt', esqlQuery: 'FROM logs' }).success).toBe(
      true
    );
  });

  it('rejects a call with neither field set', () => {
    const tool = createUpdateAiPanelConfigTool(jest.fn());
    expect(tool.schema.safeParse({}).success).toBe(false);
  });

  it('rejects a prompt over the max length', () => {
    const tool = createUpdateAiPanelConfigTool(jest.fn());
    expect(tool.schema.safeParse({ prompt: 'a'.repeat(10_001) }).success).toBe(false);
  });
});
