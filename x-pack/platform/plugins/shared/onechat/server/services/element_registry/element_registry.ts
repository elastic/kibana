/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { CustomElementConfig, ElementRegistry as IElementRegistry } from './types';

const STANDARD_TOOL_RESULT_ID_ATTR = 'tool-result-id';

export class ElementRegistry implements IElementRegistry {
  private elements = new Map<string, CustomElementConfig>();

  constructor(private logger: Logger) {}

  register(config: CustomElementConfig): void {
    const { tagName } = config;

    if (this.elements.has(tagName)) {
      this.logger.warn(`Element with tag name '${tagName}' is already registered. Overwriting.`);
    }

    this.elements.set(tagName, config);
    this.logger.debug(`Registered element: ${tagName}`);
  }

  generateAIInstructions(): string {
    if (this.elements.size === 0) {
      return '';
    }

    const instructions = Array.from(this.elements.values())
      .map((element) => this.generateElementPrompt(element))
      .join('\n\n');

    return instructions;
  }

  private generateElementPrompt(config: CustomElementConfig): string {
    const { tagName, toolResultType, additionalAttributes } = config;

    // Auto-generate description from tag name and tool result type
    const description = this.generateDescription(tagName, toolResultType);

    // All elements have the standard tool-result-id attribute
    const allAttributes = {
      toolResultId: STANDARD_TOOL_RESULT_ID_ATTR,
      ...additionalAttributes,
    };

    // Build attribute list
    const attributeDocs = Object.entries(allAttributes).map(([propName, htmlAttr]) => {
      const isToolResultId = htmlAttr === STANDARD_TOOL_RESULT_ID_ATTR;
      const required = isToolResultId ? ' (required)' : ' (optional)';
      const desc = isToolResultId
        ? ' - The tool_result_id from the tool response'
        : ` - Additional parameter for ${propName}`;
      return `  * \`${htmlAttr}\`${required}${desc}`;
    });

    // Build example usage - only include required attributes
    const exampleAttrs = `${STANDARD_TOOL_RESULT_ID_ATTR}="..."`;

    return `#### Rendering with the <${tagName}> Element

${description}

**When to use:**
This element should be used when a tool call returns a result of type "${toolResultType}".

**Syntax:**
\`\`\`
<${tagName} ${exampleAttrs} />
\`\`\`

**Attributes:**
${attributeDocs.join('\n')}

**Rules:**
* Only use this element with tool results of type \`${toolResultType}\`
* The \`${STANDARD_TOOL_RESULT_ID_ATTR}\` must exactly match the \`tool_result_id\` from the tool response
* Do not invent or modify attribute values
* The element must be self-closing (end with \`/>\`)`;
  }

  private generateDescription(tagName: string, toolResultType: string): string {
    // Convert kebab-case to Title Case for display
    const displayName = tagName
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    // Generate description based on tool result type
    const typeDescriptions: Record<string, string> = {
      tabular_data: 'Renders visualizations from tabular data results.',
      resource: 'Displays resource information from retrieved documents.',
      query: 'Shows query details and structure.',
      other: 'Renders custom output from tool results.',
      error: 'Displays error information from failed tool executions.',
    };

    const baseDescription =
      typeDescriptions[toolResultType] || `Renders ${toolResultType} results.`;

    return `${displayName}: ${baseDescription}`;
  }
}

