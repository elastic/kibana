/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isAllowedSkillRegistration } from '@kbn/agent-builder-server/allow_lists';
import { validateSkillDefinition } from '@kbn/agent-builder-server/skills/type_definition';
import { PROPOSALS_REVISE_TOOL_ID } from '@kbn/proposals-common';
import { httpServerMock } from '@kbn/core/server/mocks';
import { createProposalManagementSkill } from './proposal_management';

describe('Proposal management skill', () => {
  it('is a valid built-in skill exposing the revision tool', async () => {
    const proposalManagementSkill = createProposalManagementSkill(async () => true);
    expect(isAllowedSkillRegistration(proposalManagementSkill)).toBe(true);
    await expect(validateSkillDefinition(proposalManagementSkill)).resolves.toBeDefined();
    expect(await proposalManagementSkill.getRegistryTools?.()).toEqual([PROPOSALS_REVISE_TOOL_ID]);
  });
  it('checks each request without caching availability across users', async () => {
    const allowedRequest = httpServerMock.createKibanaRequest();
    const deniedRequest = httpServerMock.createKibanaRequest();
    const canManage = jest.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const skill = createProposalManagementSkill(canManage);
    const handler = skill.availability?.handler;
    if (!handler) {
      throw new Error('expected an availability handler');
    }
    const uiSettings = {} as Parameters<typeof handler>[0]['uiSettings'];

    expect(skill.availability?.cacheMode).toBe('none');
    await expect(
      handler({ request: allowedRequest, spaceId: 'default', uiSettings })
    ).resolves.toEqual({ status: 'available' });
    await expect(
      handler({ request: deniedRequest, spaceId: 'default', uiSettings })
    ).resolves.toEqual({
      status: 'unavailable',
      reason: 'Requires permission to manage proposals.',
    });
    expect(canManage).toHaveBeenNthCalledWith(1, allowedRequest);
    expect(canManage).toHaveBeenNthCalledWith(2, deniedRequest);
  });

  it('does not advertise availability when the privilege service fails', async () => {
    const canManage = jest.fn().mockRejectedValue(new Error('privilege service unavailable'));
    const skill = createProposalManagementSkill(canManage);
    const handler = skill.availability?.handler;
    if (!handler) {
      throw new Error('expected an availability handler');
    }
    await expect(
      handler({
        request: httpServerMock.createKibanaRequest(),
        spaceId: 'default',
        uiSettings: {} as Parameters<typeof handler>[0]['uiSettings'],
      })
    ).rejects.toThrow('privilege service unavailable');
  });
});
