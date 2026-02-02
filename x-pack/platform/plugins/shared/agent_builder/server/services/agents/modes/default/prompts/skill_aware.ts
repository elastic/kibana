/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Skill } from '@kbn/agent-builder-common/skills';
import { generateSkillSummary, groupSkillsByDomain } from '../../deep_agent/utils/skill_discovery';

/**
 * Generates the skill-aware section of the system prompt for the default agent.
 * This enables skill discovery and invocation in the default agent mode.
 */
export const getSkillAwarePromptSection = (skills: Skill[]): string => {
  if (skills.length === 0) {
    return '';
  }

  const domainGroups = groupSkillsByDomain(skills);
  const domainSummary = Object.entries(domainGroups)
    .map(([domain, domainSkills]) => `  - **${domain}**: ${domainSkills.length} skills`)
    .join('\n');

  const skillSummary = generateSkillSummary(skills);

  return `## SKILLS-FIRST APPROACH (REQUIRED)

When available, prefer using **skills** over calling tools directly.

### Skill Discovery
Before making tool calls, use the skill discovery tools to find relevant skills:
- Use \`discover_skills\` to search for skills by keywords
- Use \`read_skill_tools\` to get detailed tool information for a specific skill
- Use \`invoke_skill\` to execute skill tools

### Available Skill Domains
${domainSummary}

${skillSummary}

### When to Use Skills
- **Always prefer skills** when a relevant skill exists for the task
- Skills bundle best practices and may provide additional context
- Only fall back to direct tool calls when no relevant skill is available

### Skill Invocation Pattern
\`\`\`
invoke_skill({ name: "<tool_name>", parameters: { ... } })
\`\`\`
`;
};

/**
 * Generates a compact skill context section for prompt injection.
 * This is a lighter version for cases where full skill instructions aren't needed.
 */
export const getCompactSkillContext = (skills: Skill[]): string => {
  if (skills.length === 0) {
    return '';
  }

  const totalTools = skills.reduce((sum, skill) => sum + skill.tools.length, 0);
  const domains = [...new Set(skills.map((s) => s.namespace.split('.')[0]))];

  return `## Skills Available
- ${skills.length} skills with ${totalTools} tools across domains: ${domains.join(', ')}
- Use \`discover_skills\` to find relevant skills, then \`invoke_skill\` to execute them.
`;
};

/**
 * Generates skill-specific tool selection guidance for the research agent.
 */
export const getSkillToolSelectionGuidance = (skills: Skill[]): string => {
  if (skills.length === 0) {
    return '';
  }

  // Group skills by domain for organized presentation
  const domainGroups = groupSkillsByDomain(skills);
  const guidanceLines: string[] = [];

  for (const [domain, domainSkills] of Object.entries(domainGroups)) {
    const skillNames = domainSkills.map((s) => s.namespace).slice(0, 3);
    const moreCount = domainSkills.length - 3;
    const skillList =
      moreCount > 0 ? `${skillNames.join(', ')} (+${moreCount} more)` : skillNames.join(', ');

    guidanceLines.push(`  - **${domain}**: ${skillList}`);
  }

  return `### Skill-Based Tool Selection

Before using direct tools, check if a skill can handle your task:

**Available Skill Domains:**
${guidanceLines.join('\n')}

**Skill Discovery Workflow:**
1. Use \`discover_skills({ query: "<your task keywords>" })\` to find relevant skills
2. Use \`read_skill_tools({ skill_namespace: "<skill>" })\` to understand available tools
3. Use \`invoke_skill({ name: "<tool>", parameters: { ... } })\` to execute

**When to use direct tools instead:**
- No relevant skill exists for the task
- The user explicitly requests a specific tool
- The skill invocation fails and a fallback is needed
`;
};

/**
 * Generates a skill discovery prompt for when the agent should explore available skills.
 */
export const getSkillDiscoveryPrompt = (userQuery: string): string => {
  return `Analyze the following user query and determine which skills might be relevant:

User Query: "${userQuery}"

Steps:
1. Identify key concepts and domains mentioned in the query
2. Use \`discover_skills\` with relevant keywords to find matching skills
3. Review the top results and select the most appropriate skill(s)
4. Use \`read_skill_tools\` to understand the capabilities of selected skills
5. Proceed with skill invocation if appropriate

Focus on finding skills that directly address the user's needs rather than generic tools.
`;
};
