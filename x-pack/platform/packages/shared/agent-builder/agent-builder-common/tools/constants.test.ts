/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  attachmentTools,
  getInternalToolKind,
  internalTools,
  platformCoreTools,
} from './constants';

describe('getInternalToolKind', () => {
  it('classifies every internal tool', () => {
    for (const toolId of Object.values(internalTools)) {
      expect(getInternalToolKind(toolId)).toMatch(/^(runtime|data_access)$/);
    }
  });

  it.each([
    internalTools.writeTodos,
    internalTools.loadSkill,
    internalTools.searchRelevantSkills,
    internalTools.sleep,
    internalTools.askUserQuestion,
    internalTools.setConversationMetadata,
  ])('classifies %s as runtime', (toolId) => {
    expect(getInternalToolKind(toolId)).toBe('runtime');
  });

  it.each([
    internalTools.readFile,
    internalTools.listFiles,
    internalTools.bash,
    internalTools.executeApi,
    internalTools.discoverApis,
    internalTools.describeApi,
    internalTools.describeApiType,
    internalTools.runSubagent,
    internalTools.sendMessageToAgent,
  ])('classifies %s as data_access', (toolId) => {
    expect(getInternalToolKind(toolId)).toBe('data_access');
  });

  it('classifies every known attachment tool as runtime', () => {
    for (const toolId of Object.values(attachmentTools)) {
      expect(getInternalToolKind(toolId)).toBe('runtime');
    }
  });

  it('leaves an unknown attachments.* tool unclassified so it is not silently dropped', () => {
    expect(getInternalToolKind('attachments.some_future_tool')).toBeUndefined();
    expect(getInternalToolKind('attachments.fetch_from_es')).toBeUndefined();
  });

  it('classifies legacy filestore tools as data_access', () => {
    expect(getInternalToolKind('filestore.read')).toBe('data_access');
    expect(getInternalToolKind('filestore.grep')).toBe('data_access');
  });

  it('returns undefined for tools that are not internal', () => {
    expect(getInternalToolKind(platformCoreTools.search)).toBeUndefined();
    expect(getInternalToolKind('security.alerts')).toBeUndefined();
    expect(getInternalToolKind('my_custom_tool')).toBeUndefined();
    expect(getInternalToolKind('attachments')).toBeUndefined();
  });
});
