/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Prompt template used to synthesize raw knowledge indicators (features, queries)
 * from streams into architectural prose summaries suitable for memory storage.
 */
export const sigeventsSynthesisPrompt = ({
  streamName,
  indicators,
  existingMemory,
}: {
  streamName: string;
  indicators: string;
  existingMemory: string | undefined;
}) => `You are an architecture knowledge synthesizer. Given raw knowledge indicators
(features, queries, patterns) discovered from a data stream, produce a concise
architectural summary suitable for a shared knowledge base.

## Stream: ${streamName}

## Raw Knowledge Indicators
${indicators}

${
  existingMemory
    ? `## Existing Memory for This Stream
${existingMemory}

Update the existing memory with any new insights. Preserve accurate existing content
and correct anything that is now known to be wrong.`
    : `No existing memory for this stream. Create a new architectural overview.`
}

## Output Format

Produce a markdown document with these sections:

# ${streamName}

[One-paragraph description of what this service/stream does and its role in the system.]

## Key Behaviors
[Bulleted list of notable behaviors, patterns, and characteristics observed from the indicators.]

## Operational Patterns
[Bulleted list of operational insights — what to watch for, correlations, known failure modes.]

Keep it factual and concise. Do NOT list raw indicator names — synthesize them into
architectural understanding. Write as if explaining to a new team member.`;
