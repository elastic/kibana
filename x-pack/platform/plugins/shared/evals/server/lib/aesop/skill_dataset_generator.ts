/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

export interface GeneratedTestCase {
  input: { query: string; context?: Record<string, unknown> };
  output: { expected_behavior: string; expected_tools?: string[] };
  metadata: {
    skill_id: string;
    skill_name: string;
    case_type: 'happy_path' | 'edge_case' | 'boundary';
  };
}

export class SkillDatasetGenerator {
  constructor(private readonly logger: Logger) {}

  async generateTestCases(
    skill: { name: string; description: string; markdown: string; id: string },
    options: {
      actionsClient: { execute: (...args: any[]) => Promise<any> };
      connectorId: string;
      count?: number;
    }
  ): Promise<GeneratedTestCase[]> {
    const { actionsClient, connectorId, count = 10 } = options;

    const prompt = `You are an expert evaluation dataset designer for Elastic Security AI agents.

Given the following Agent Builder skill, generate exactly ${count} diverse test cases that would evaluate how well an agent performs when using this skill.

## Skill: ${skill.name}
${skill.description}

## Skill Content:
${skill.markdown}

## Requirements:
- Generate ${count} test cases as a JSON array
- Each test case must have:
  - "query": a realistic analyst question that this skill should handle
  - "expected_behavior": what a correct agent response should include
  - "expected_tools": array of tool IDs the agent should use (e.g., "platform.core.execute_esql")
  - "case_type": one of "happy_path", "edge_case", or "boundary"
- Include at least 60% happy_path, 20% edge_case, 20% boundary cases
- Make queries specific and realistic — what a real SOC analyst would ask
- Expected behaviors should be verifiable — mention specific fields, patterns, or response structure

Respond with ONLY a JSON array, no other text.`;

    try {
      const result = await actionsClient.execute({
        actionId: connectorId,
        params: {
          subAction: 'run',
          subActionParams: {
            body: JSON.stringify({
              messages: [{ role: 'user', content: prompt }],
              temperature: 0.7,
            }),
          },
        },
      });

      const responseText =
        (result as any)?.data?.message ??
        (result as any)?.data?.choices?.[0]?.message?.content ??
        '';

      return this.parseTestCases(responseText, skill);
    } catch (error) {
      this.logger.error(
        `[AESOP] Failed to generate test cases: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return [];
    }
  }

  private parseTestCases(
    response: string,
    skill: { id: string; name: string }
  ): GeneratedTestCase[] {
    try {
      let cleaned = response;
      cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/g, '');
      cleaned = cleaned
        .replace(/```json?\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();
      const match = cleaned.match(/\[[\s\S]*\]/);
      if (!match) return [];

      const parsed = JSON.parse(match[0]);
      if (!Array.isArray(parsed)) return [];

      return parsed.map((item: any) => ({
        input: {
          query: String(item.query || ''),
          context: item.context || {},
        },
        output: {
          expected_behavior: String(item.expected_behavior || ''),
          expected_tools: Array.isArray(item.expected_tools) ? item.expected_tools : [],
        },
        metadata: {
          skill_id: skill.id,
          skill_name: skill.name,
          case_type: ['happy_path', 'edge_case', 'boundary'].includes(item.case_type)
            ? item.case_type
            : 'happy_path',
        },
      }));
    } catch {
      this.logger.warn('[AESOP] Failed to parse LLM test case response');
      return [];
    }
  }
}
