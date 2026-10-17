/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import {
  CREATE_CUSTOM_APP_TOOL_ID,
  UPDATE_CUSTOM_APP_TOOL_ID,
} from '../tools/update_custom_app_tool';
import { CUSTOM_APP_CREATION_SKILL_ID, customAppCreationSkill } from './custom_app_creation_skill';

describe('the custom app creation skill', () => {
  it('has the id the allowlist knows it by', () => {
    expect(customAppCreationSkill.id).toBe(CUSTOM_APP_CREATION_SKILL_ID);
    expect(CUSTOM_APP_CREATION_SKILL_ID).toBe('custom-app-creation');
  });

  it('gives the agent the tools to create and change an app, to try a query, and to draft a workflow', () => {
    const tools = customAppCreationSkill.getRegistryTools?.() ?? [];

    expect(tools).toEqual(
      expect.arrayContaining([
        CREATE_CUSTOM_APP_TOOL_ID,
        UPDATE_CUSTOM_APP_TOOL_ID,
        platformCoreTools.executeEsql,
        platformCoreTools.generateWorkflow,
      ])
    );
  });

  it('says to draft a workflow that does not exist, and to wait until it is saved, not to invent one', () => {
    const { content } = customAppCreationSkill;

    expect(content).toContain(platformCoreTools.generateWorkflow);
    expect(content).toContain('do not invent an id');
    expect(content).toContain('save it in the Workflows application');
  });

  it('says that an app can be saved as an app, not only to a dashboard', () => {
    expect(customAppCreationSkill.content).toContain('save it as an app, or to a dashboard');
  });
});
