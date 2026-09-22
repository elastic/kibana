/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DissectProcessor, GrokProcessor } from '@kbn/streamlang';

/**
 * Human-readable block for the suggestion prompt: describes the system-managed grok/dissect
 * that already ran so samples match that shape. Not a processor the agent should recreate.
 */
export function formatUpstreamSeedParsingContextForPromptMarkdown(
  processor: GrokProcessor | DissectProcessor
): string {
  const lines: string[] = [
    'A **managed upstream** step already ran **`grok` or `dissect`** on raw events before these samples. It is **not** part of the pipeline you suggest, and your tool schema **excludes** grok/dissect. The block below is the extraction definition for context only.',
    '',
    '**Definition**',
    '',
  ];

  if (processor.action === 'grok') {
    lines.push(`- **Processor type:** \`grok\``);
    lines.push(`- **Source field (\`from\`):** \`${processor.from}\``);
    lines.push('- **Grok patterns** (evaluated in order):');
    processor.patterns.forEach((pattern, index) => {
      lines.push(`- Pattern ${index + 1}:`);
      lines.push('```');
      lines.push(pattern.replace(/\n$/u, ''));
      lines.push('```');
    });
    if (processor.pattern_definitions && Object.keys(processor.pattern_definitions).length > 0) {
      lines.push('- **Custom pattern definitions:**');
      lines.push('```json');
      lines.push(JSON.stringify(processor.pattern_definitions, null, 2));
      lines.push('```');
    }
  } else {
    lines.push(`- **Processor type:** \`dissect\``);
    lines.push(`- **Source field (\`from\`):** \`${processor.from}\``);
    lines.push('- **Dissect pattern:**');
    lines.push('```');
    lines.push(processor.pattern.replace(/\n$/u, ''));
    lines.push('```');
    if (processor.append_separator !== undefined) {
      lines.push(`- **Append separator:** \`${String(processor.append_separator)}\``);
    }
  }

  if (processor.ignore_missing !== undefined) {
    lines.push(`- **ignore_missing:** \`${processor.ignore_missing}\``);
  }
  if (processor.where !== undefined) {
    lines.push('- **Conditional (`where`):**');
    lines.push('```json');
    lines.push(JSON.stringify(processor.where, null, 2));
    lines.push('```');
  }

  return lines.join('\n');
}
