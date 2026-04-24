/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { VisualizationAgentPlugin } from './plugin';

describe('VisualizationAgentPlugin public', () => {
  it('registers the visualization attachment UI', () => {
    const addAttachmentType = jest.fn();
    const coreStart = coreMock.createStart();
    coreStart.application.capabilities.dashboard_v2 = { showWriteControls: true } as never;

    const plugin = new VisualizationAgentPlugin(coreMock.createPluginInitializerContext());

    plugin.start(coreStart, {
      agentBuilder: {
        attachments: { addAttachmentType },
      },
      dataViews: {} as never,
      lens: {} as never,
      uiActions: {} as never,
    } as never);

    expect(addAttachmentType).toHaveBeenCalledWith(
      'visualization',
      expect.objectContaining({
        getIcon: expect.any(Function),
        getLabel: expect.any(Function),
        renderInlineContent: expect.any(Function),
      })
    );
  });
});
