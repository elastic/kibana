/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { SkillDefinition } from '@kbn/onechat-server';
import type { CasesServerStart } from '../types';

const createCaseSchema = z.object({
  title: z.string().min(1).max(160).describe('Title of the case'),
  description: z.string().min(1).max(30000).describe('Description of the case'),
  owner: z.string().describe('The owner/plugin identifier (e.g., "securitySolution", "observability")'),
  tags: z.array(z.string()).optional().describe('Tags to associate with the case'),
  severity: z
    .enum(['low', 'medium', 'high', 'critical'])
    .optional()
    .describe('Severity level of the case'),
  category: z.string().nullable().optional().describe('Category of the case'),
  assignees: z
    .array(
      z.object({
        uid: z.string(),
      })
    )
    .optional()
    .describe('Users assigned to the case'),
  customFields: z
    .array(
      z.object({
        key: z.string(),
        type: z.string(),
        value: z.any(),
      })
    )
    .optional()
    .describe('Custom field values'),
  connector: z
    .object({
      id: z.string(),
      name: z.string(),
      type: z.string(),
      fields: z.record(z.any()).nullable().optional(),
    })
    .optional()
    .describe('External connector configuration'),
  settings: z
    .object({
      syncAlerts: z.boolean().optional(),
    })
    .optional()
    .describe('Case settings'),
});

const searchCasesSchema = z.object({
  owner: z.string().optional().describe('Filter by owner/plugin identifier'),
  tags: z.array(z.string()).optional().describe('Filter by tags'),
  status: z.enum(['open', 'in-progress', 'closed']).optional().describe('Filter by status'),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional().describe('Filter by severity'),
  assignees: z.array(z.string()).optional().describe('Filter by assignee UIDs'),
  reporters: z.array(z.string()).optional().describe('Filter by reporter UIDs'),
  category: z.string().optional().describe('Filter by category'),
  page: z.number().optional().describe('Page number for pagination'),
  perPage: z.number().optional().describe('Number of results per page'),
  sortField: z.string().optional().describe('Field to sort by'),
  sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort order'),
});

const getCaseSchema = z.object({
  id: z.string().describe('Case ID to retrieve'),
});

const updateCaseSchema = z.object({
  id: z.string().describe('Case ID to update'),
  version: z.string().describe('Case version (required for optimistic concurrency control)'),
  title: z.string().optional().describe('Updated title'),
  description: z.string().optional().describe('Updated description'),
  status: z.enum(['open', 'in-progress', 'closed']).optional().describe('Updated status'),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional().describe('Updated severity'),
  tags: z.array(z.string()).optional().describe('Updated tags'),
  assignees: z
    .array(
      z.object({
        uid: z.string(),
      })
    )
    .optional()
    .describe('Updated assignees'),
  category: z.string().nullable().optional().describe('Updated category'),
});

const deleteCaseSchema = z.object({
  ids: z.array(z.string()).describe('Array of case IDs to delete'),
});

export function createCasesSkills({
  casesPluginStart,
}: {
  casesPluginStart: CasesServerStart;
}): SkillDefinition[] {
  const createCaseSkill: SkillDefinition = {
    id: 'cases.create_case',
    name: 'Create Case',
    description:
      'Create a new case for tracking and managing issues. Cases can be associated with alerts, have assignees, tags, severity levels, and custom fields.',
    category: 'cases',
    inputSchema: createCaseSchema,
    examples: [
      // Create a basic security case
      'tool("invoke_skill", {"skillId":"cases.create_case","params":{"title":"Suspicious login activity","description":"Multiple failed login attempts detected","owner":"securitySolution"}})',
      // Create an observability case
      'tool("invoke_skill", {"skillId":"cases.create_case","params":{"title":"Service outage","description":"API service is not responding","owner":"observability"}})',
      // Create a case with severity and tags
      'tool("invoke_skill", {"skillId":"cases.create_case","params":{"title":"Critical incident","description":"Production database unavailable","owner":"securitySolution","severity":"critical","tags":["incident","production"]}})',
      // Create a case with assignees
      'tool("invoke_skill", {"skillId":"cases.create_case","params":{"title":"Investigate malware","description":"Potential malware detected on endpoint","owner":"securitySolution","severity":"high","assignees":[{"uid":"<user_uid>"}]}})',
    ],
    handler: async (params, context) => {
      const request = 'request' in context ? context.request : (context as any).request;
      if (!request) {
        throw new Error('Request is required to create a case');
      }

      // Get cases client using the provided Cases plugin start contract
      const casesClient = await casesPluginStart.getCasesClientWithRequest(request);
      const theCase = await casesClient.cases.create(params as any);
      return theCase;
    },
  };

  const searchCasesSkill: SkillDefinition = {
    id: 'cases.search_cases',
    name: 'Search Cases',
    description: 'Search and filter cases by various criteria including owner, tags, status, severity, assignees, and more.',
    category: 'cases',
    inputSchema: searchCasesSchema,
    examples: [
      // Search all cases with default pagination
      'tool("invoke_skill", {"skillId":"cases.search_cases","params":{}})',
      // Search for open security cases
      'tool("invoke_skill", {"skillId":"cases.search_cases","params":{"owner":"securitySolution","status":"open"}})',
      // Search for high severity cases
      'tool("invoke_skill", {"skillId":"cases.search_cases","params":{"severity":"high","perPage":20}})',
      // Search cases by tags
      'tool("invoke_skill", {"skillId":"cases.search_cases","params":{"tags":["incident"],"sortField":"created_at","sortOrder":"desc"}})',
      // Search cases assigned to a user
      'tool("invoke_skill", {"skillId":"cases.search_cases","params":{"assignees":["<user_uid>"],"status":"in-progress"}})',
    ],
    handler: async (params, context) => {
      const request = 'request' in context ? context.request : (context as any).request;
      if (!request) {
        throw new Error('Request is required to search cases');
      }

      const casesClient = await casesPluginStart.getCasesClientWithRequest(request);
      const results = await casesClient.cases.search(params as any);
      return results;
    },
  };

  const getCaseSkill: SkillDefinition = {
    id: 'cases.get_case',
    name: 'Get Case',
    description: 'Retrieve a specific case by its ID with all details including comments, attachments, and metadata.',
    category: 'cases',
    inputSchema: getCaseSchema,
    examples: [
      // Get a case by ID
      'tool("invoke_skill", {"skillId":"cases.get_case","params":{"id":"<case_id>"}})',
    ],
    handler: async (params, context) => {
      const request = 'request' in context ? context.request : (context as any).request;
      if (!request) {
        throw new Error('Request is required to get a case');
      }

      const casesClient = await casesPluginStart.getCasesClientWithRequest(request);
      const theCase = await casesClient.cases.get({ id: params.id });
      return theCase;
    },
  };

  const updateCaseSkill: SkillDefinition = {
    id: 'cases.update_case',
    name: 'Update Case',
    description:
      'Update an existing case. Requires the case version for optimistic concurrency control. Can update title, description, status, severity, tags, assignees, and category.',
    category: 'cases',
    inputSchema: updateCaseSchema,
    examples: [
      // Update case status to in-progress
      'tool("invoke_skill", {"skillId":"cases.update_case","params":{"id":"<case_id>","version":"<case_version>","status":"in-progress"}})',
      // Update case severity to critical
      'tool("invoke_skill", {"skillId":"cases.update_case","params":{"id":"<case_id>","version":"<case_version>","severity":"critical"}})',
      // Add tags to a case
      'tool("invoke_skill", {"skillId":"cases.update_case","params":{"id":"<case_id>","version":"<case_version>","tags":["incident","high-priority"]}})',
      // Close a case
      'tool("invoke_skill", {"skillId":"cases.update_case","params":{"id":"<case_id>","version":"<case_version>","status":"closed"}})',
      // Assign users to a case
      'tool("invoke_skill", {"skillId":"cases.update_case","params":{"id":"<case_id>","version":"<case_version>","assignees":[{"uid":"<user_uid>"}]}})',
    ],
    handler: async (params, context) => {
      const request = 'request' in context ? context.request : (context as any).request;
      if (!request) {
        throw new Error('Request is required to update a case');
      }

      const { id, version, ...updates } = params;

      const casesClient = await casesPluginStart.getCasesClientWithRequest(request);
      const updatedCases = await casesClient.cases.bulkUpdate([
        {
          id,
          version,
          ...updates,
        },
      ]);
      return updatedCases[0];
    },
  };

  const deleteCaseSkill: SkillDefinition = {
    id: 'cases.delete_case',
    name: 'Delete Case',
    description: 'Delete one or more cases by their IDs. This will also delete all comments and attachments associated with the cases.',
    category: 'cases',
    inputSchema: deleteCaseSchema,
    examples: [
      // Delete a single case
      'tool("invoke_skill", {"skillId":"cases.delete_case","params":{"ids":["<case_id>"]}})',
      // Delete multiple cases
      'tool("invoke_skill", {"skillId":"cases.delete_case","params":{"ids":["<case_id_1>","<case_id_2>"]}})',
    ],
    handler: async (params, context) => {
      const request = 'request' in context ? context.request : (context as any).request;
      if (!request) {
        throw new Error('Request is required to delete cases');
      }

      const casesClient = await casesPluginStart.getCasesClientWithRequest(request);
      await casesClient.cases.delete(params.ids);
      return { success: true, deletedIds: params.ids };
    },
  };

  return [createCaseSkill, searchCasesSkill, getCaseSkill, updateCaseSkill, deleteCaseSkill];
}

