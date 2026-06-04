/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, HttpStart } from '@kbn/core/public';
import type { AgentsServiceStartContract } from '@kbn/agent-builder-browser';
import type { ActionButton } from '@kbn/agent-builder-browser/attachments';
import { SKILL_ATTACHMENT_TYPE, type SkillAttachment } from '../../../common/attachments';
import { createSkillAttachmentDefinition } from './skill_attachment';

jest.mock('@kbn/agent-builder-plugin/public', () => ({
  SKILLS_API_PATH: '/api/agent_builder/skills',
  AGENTBUILDER_APP_ID: 'agent_builder',
}));

const CREATE_BUTTON_LABEL = 'Create skill';
const NEW_SKILL_ID = 'track-purchases';

const buildAttachment = (): SkillAttachment =>
  ({
    id: 'attachment-1',
    type: SKILL_ATTACHMENT_TYPE,
    data: {
      id: NEW_SKILL_ID,
      name: 'Track purchases',
      description: 'Tracks small purchases',
      content: 'instructions',
      tool_ids: [],
      referenced_content: [],
    },
    // version === versionCount marks the draft as the latest, which is the
    // condition under which the "Create skill" button is rendered.
    version: 1,
    versionCount: 1,
  } as unknown as SkillAttachment);

const setup = () => {
  const post = jest.fn().mockResolvedValue({ id: NEW_SKILL_ID });
  const addSuccess = jest.fn();
  const addError = jest.fn();
  const addSkillToAgent = jest.fn().mockResolvedValue({});
  const updateOrigin = jest.fn().mockResolvedValue(undefined);

  const http = { post } as unknown as HttpStart;
  const notifications = {
    toasts: { addSuccess, addError },
  } as unknown as CoreStart['notifications'];
  const application = {
    capabilities: { agentBuilder: { manageSkills: true } },
    getUrlForApp: jest.fn(),
  } as unknown as CoreStart['application'];
  const agents = { list: jest.fn(), addSkillToAgent } as unknown as AgentsServiceStartContract;

  const definition = createSkillAttachmentDefinition({ http, notifications, application, agents });

  const getCreateHandler = (agentId?: string) => {
    const buttons: ActionButton[] =
      definition.getActionButtons?.({
        attachment: buildAttachment(),
        agentId,
        isSidebar: false,
        isCanvas: false,
        updateOrigin,
      }) ?? [];
    const createButton = buttons.find((button) => button.label === CREATE_BUTTON_LABEL);
    if (!createButton) {
      throw new Error('Create skill button not found');
    }
    return createButton.handler;
  };

  return { post, addSuccess, addError, addSkillToAgent, updateOrigin, getCreateHandler };
};

describe('createSkillAttachmentDefinition - Create skill', () => {
  it('creates the skill and adds it to the current agent', async () => {
    const { post, addSuccess, addError, addSkillToAgent, updateOrigin, getCreateHandler } = setup();

    await getCreateHandler('agent-1')();

    expect(post).toHaveBeenCalledWith('/api/agent_builder/skills', expect.any(Object));
    expect(updateOrigin).toHaveBeenCalledWith(NEW_SKILL_ID);
    expect(addSkillToAgent).toHaveBeenCalledWith({ agentId: 'agent-1', skillId: NEW_SKILL_ID });
    expect(addSuccess).toHaveBeenCalledTimes(1);
    expect(addError).not.toHaveBeenCalled();
  });

  it('creates the skill without attaching when there is no current agent', async () => {
    const { addSkillToAgent, addSuccess, addError, getCreateHandler } = setup();

    await getCreateHandler(undefined)();

    expect(addSkillToAgent).not.toHaveBeenCalled();
    expect(addSuccess).toHaveBeenCalledTimes(1);
    expect(addError).not.toHaveBeenCalled();
  });

  it('keeps the created skill and reports separately when attaching to the agent fails', async () => {
    const { addSkillToAgent, addSuccess, addError, updateOrigin, getCreateHandler } = setup();
    addSkillToAgent.mockRejectedValueOnce(new Error('forbidden'));

    await getCreateHandler('agent-1')();

    expect(updateOrigin).toHaveBeenCalledWith(NEW_SKILL_ID);
    expect(addSkillToAgent).toHaveBeenCalledWith({ agentId: 'agent-1', skillId: NEW_SKILL_ID });
    expect(addError).toHaveBeenCalledTimes(1);
    expect(addSuccess).not.toHaveBeenCalled();
  });

  it('does not attempt to attach when skill creation fails', async () => {
    const { post, addSkillToAgent, addSuccess, addError, getCreateHandler } = setup();
    post.mockRejectedValueOnce(new Error('boom'));

    await getCreateHandler('agent-1')();

    expect(addSkillToAgent).not.toHaveBeenCalled();
    expect(addSuccess).not.toHaveBeenCalled();
    expect(addError).toHaveBeenCalledTimes(1);
  });
});
