/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateSkillDefinition } from '@kbn/agent-builder-server/skills/type_definition';
import {
  isAllowedBuiltinAttachment,
  isAllowedSkillRegistration,
} from '@kbn/agent-builder-server/allow_lists';
import { FILE_UPLOAD_ATTACHMENT_TYPE } from '@kbn/file-upload-common';
import { createFileUploadSkill } from './file_upload_skill';
import { PROPOSE_FILE_UPLOAD_TOOL_ID } from './propose_file_upload_tool';

describe('createFileUploadSkill', () => {
  const skill = createFileUploadSkill();

  it('passes the agent-builder skill-definition schema', async () => {
    await expect(validateSkillDefinition(skill)).resolves.toBeDefined();
  });

  it('is in the Agent Builder allow lists, with its attachment type', () => {
    expect(isAllowedSkillRegistration(skill)).toBe(true);
    expect(isAllowedBuiltinAttachment(FILE_UPLOAD_ATTACHMENT_TYPE)).toBe(true);
  });

  it('exposes the propose_file_upload tool', async () => {
    const tools = await skill.getInlineTools?.();
    expect(tools?.map(({ id }) => id)).toEqual([PROPOSE_FILE_UPLOAD_TOOL_ID]);
  });
});
