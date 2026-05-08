/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ListSkillsResponse,
  GetSkillResponse,
  CreateSkillResponse,
  UpdateSkillResponse,
  DeleteSkillResponse,
  CreateSkillPayload,
  UpdateSkillPayload,
} from '../../common/http_api/skills';

export const listSkillsOas = () => {
  const response: ListSkillsResponse = {
    results: [
      {
        id: 'built-in-skill-id',
        name: 'Built-in Skill',
        description: 'A built-in skill provided by the platform.',
        readonly: true,
        experimental: false,
        referenced_content_count: 0,
      },
      {
        id: 'custom-skill-id',
        name: 'Custom Skill',
        description: 'A user-created skill for data analysis.',
        readonly: false,
        experimental: false,
        tool_ids: ['platform.core.search'],
        referenced_content_count: 1,
      },
    ],
  };

  return {
    responses: {
      200: {
        description: 'Indicates a successful response',
        content: {
          'application/json': {
            examples: {
              listSkillsResponseExample: { value: response },
            },
          },
        },
      },
    },
  };
};

export const getSkillOas = () => {
  const response: GetSkillResponse = {
    id: 'my-custom-skill',
    name: 'Custom Analysis Skill',
    description: 'A skill for performing custom data analysis.',
    content: 'You are an expert data analyst. Use the available tools to query and analyze data.',
    tool_ids: ['platform.core.search'],
    readonly: false,
    experimental: false,
  };

  return {
    responses: {
      200: {
        description: 'Indicates a successful response',
        content: {
          'application/json': {
            examples: {
              getSkillResponseExample: { value: response },
            },
          },
        },
      },
    },
  };
};

export const createSkillOas = () => {
  const request: CreateSkillPayload = {
    id: 'my-custom-skill',
    name: 'Custom Analysis Skill',
    description: 'A skill for performing custom data analysis.',
    content: 'You are an expert data analyst. Use the available tools to query and analyze data.',
    tool_ids: ['platform.core.search'],
  };

  const response: CreateSkillResponse = {
    id: 'my-custom-skill',
    name: 'Custom Analysis Skill',
    description: 'A skill for performing custom data analysis.',
    content: 'You are an expert data analyst. Use the available tools to query and analyze data.',
    tool_ids: ['platform.core.search'],
    readonly: false,
    experimental: false,
  };

  return {
    requestBody: {
      content: {
        'application/json': {
          examples: {
            createSkillRequestExample: { value: request },
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Indicates a successful response',
        content: {
          'application/json': {
            examples: {
              createSkillResponseExample: { value: response },
            },
          },
        },
      },
    },
  };
};

export const updateSkillOas = () => {
  const request: UpdateSkillPayload = {
    name: 'Updated Skill Name',
    description: 'Updated description for the skill.',
    content: 'Updated skill instructions content.',
    tool_ids: ['platform.core.search', 'platform.core.execute_esql'],
  };

  const response: UpdateSkillResponse = {
    id: 'my-custom-skill',
    name: 'Updated Skill Name',
    description: 'Updated description for the skill.',
    content: 'Updated skill instructions content.',
    tool_ids: ['platform.core.search', 'platform.core.execute_esql'],
    readonly: false,
    experimental: false,
  };

  return {
    requestBody: {
      content: {
        'application/json': {
          examples: {
            updateSkillRequestExample: { value: request },
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Indicates a successful response',
        content: {
          'application/json': {
            examples: {
              updateSkillResponseExample: { value: response },
            },
          },
        },
      },
    },
  };
};

export const deleteSkillOas = () => {
  const response: DeleteSkillResponse = {
    success: true,
  };

  return {
    responses: {
      200: {
        description: 'Indicates a successful response',
        content: {
          'application/json': {
            examples: {
              deleteSkillResponseExample: { value: response },
            },
          },
        },
      },
    },
  };
};
