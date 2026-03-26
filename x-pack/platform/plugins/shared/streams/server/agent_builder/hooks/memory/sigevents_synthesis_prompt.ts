/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * A single wiki page entry produced by the synthesis prompt.
 */
export interface SynthesizedWikiPage {
  path: string;
  title: string;
  content: string;
  tags: string[];
}

/**
 * Prompt template used to synthesize raw knowledge indicators (features, queries)
 * from streams into a set of focused wiki pages for the shared knowledge base.
 */
export const sigeventsSynthesisPrompt = ({
  streamName,
  indicators,
  existingEntries,
}: {
  streamName: string;
  indicators: string;
  existingEntries?: Array<{ path: string; title: string; content: string }>;
}) => {
  const existingSection =
    existingEntries && existingEntries.length > 0
      ? `## Existing Wiki Pages for This Stream
${existingEntries.map((e) => `### ${e.title} (${e.path})\n${e.content}`).join('\n\n')}

Update existing pages with new insights. Preserve accurate content and correct anything now known to be wrong. Add new pages for entities not yet covered.`
      : `No existing wiki pages for this stream. Create pages from scratch.`;

  return `You are building a wiki that documents a live system based on observability data.
Given raw knowledge indicators (features, queries, patterns) discovered from the data stream "${streamName}", produce a set of focused wiki pages.

## Raw Knowledge Indicators
${indicators}

${existingSection}

## Instructions

Analyze the indicators and create **separate, focused wiki pages** for each distinct entity you identify:

1. **Stream overview** — path: \`architecture/${streamName}/overview\`
   One page describing the overall stream: what data it carries, its role in the system, key characteristics.

2. **Service pages** — path: \`architecture/${streamName}/services/{service-name}\`
   One page per distinct service/microservice found in the indicators. Document what it does, its dependencies, communication patterns, and known behaviors.

3. **Infrastructure pages** — path: \`architecture/${streamName}/infrastructure/{component-name}\`
   One page per infrastructure component (collectors, caches, databases, message queues, load balancers). Document configuration, role, and operational characteristics.

4. **Operational patterns** — path: \`operations/${streamName}/patterns\`
   One page documenting failure modes, error patterns, correlations, and things to watch for.

Rules:
- Each page should be **self-contained** — a reader should understand the topic without reading other pages
- Write factual, concise markdown. Synthesize indicators into understanding — do NOT list raw indicator names
- Write as if explaining to a new team member joining the on-call rotation
- Only create pages for entities you have evidence for — do not invent services or components
- Use cross-references like "See also: [Service X](architecture/${streamName}/services/x)" when relevant

## Output Format

Respond with a JSON array of objects. Each object represents one wiki page:

\`\`\`json
[
  {
    "path": "architecture/${streamName}/overview",
    "title": "${streamName} - System Overview",
    "content": "# ${streamName}\\n\\nMarkdown content here...",
    "tags": ["architecture", "${streamName}"]
  }
]
\`\`\`

Return ONLY the JSON array, no other text.`;
};

/**
 * Parse the LLM response from the synthesis prompt into wiki page objects.
 */
export const parseSynthesisResponse = (response: string): SynthesizedWikiPage[] => {
  try {
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return [];
    }
    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(
      (item): item is SynthesizedWikiPage =>
        typeof item === 'object' &&
        item !== null &&
        typeof item.path === 'string' &&
        typeof item.title === 'string' &&
        typeof item.content === 'string' &&
        Array.isArray(item.tags)
    );
  } catch {
    return [];
  }
};
