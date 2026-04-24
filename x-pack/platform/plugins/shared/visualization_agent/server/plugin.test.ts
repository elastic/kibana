/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { platformCoreTools } from '@kbn/agent-builder-common';
import { VisualizationAgentPlugin } from './plugin';
import { visualizationCreationSkill } from './skills/visualization_creation_skill';

describe('VisualizationAgentPlugin', () => {
  it('registers the visualization tool, attachment type, skill, and SML type', () => {
    const registerTool = jest.fn();
    const registerAttachmentType = jest.fn();
    const registerSkill = jest.fn();
    const registerSmlType = jest.fn();

    const plugin = new VisualizationAgentPlugin(coreMock.createPluginInitializerContext());

    plugin.setup(
      {} as never,
      {
        agentBuilder: {
          tools: { register: registerTool },
          attachments: { registerType: registerAttachmentType },
          skills: { register: registerSkill },
          sml: { registerType: registerSmlType },
        },
      } as never
    );

    expect(registerTool).toHaveBeenCalledWith(
      expect.objectContaining({ id: platformCoreTools.createVisualization })
    );
    expect(registerAttachmentType).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'visualization' })
    );
    expect(registerSkill).toHaveBeenCalledWith(visualizationCreationSkill);
    expect(registerSmlType).toHaveBeenCalledWith(expect.objectContaining({ id: 'visualization' }));
  });
});
