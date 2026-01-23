/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  ALL_MATH_FUNCTIONS,
  CATEGORY_TO_DOC_SECTION,
  type MathFunctionDefinition,
} from './language_definition';

/**
 * Documentation for the Math Expression Language
 *
 * This file generates documentation from language_definition.ts.
 * It contains only non-language elements like intro text and section labels.
 */

// Intro text for documentation
export const mathExpressionLanguageIntro = i18n.translate('xpack.streams.math.docsIntro', {
  defaultMessage: `## Math Expressions

Arithmetic and logical expressions that compute values from document fields.

### How it works

Expressions are evaluated **per document**. Each document is processed independently — values from other documents cannot be accessed and aggregations cannot be performed.

### Examples

- Calculate duration in seconds:
    \`attributes.request.duration_ms / 1000\`

- Compute throughput (bytes per second):
    \`resource.network.bytes_sent / attributes.elapsed_time\`

- Boolean comparison (_result is stored as boolean_):
    \`resource.memory.used > resource.memory.limit * 0.9\`

- Natural logarithm:
    \`log(attributes.bytes)\`

- Complex arithmetic:
    \`(attributes.price * attributes.quantity) - attributes.discount\`


### Field References

Fields are referenced directly by name:
- Simple fields: \`bytes\`, \`duration\`
- Nested fields: \`attributes.request.duration_ms\`, \`resource.cpu.usage\`
- Special characters require quotes: \`"field-with-dashes"\`

### Operators

- **Arithmetic:** \`+\`, \`-\`, \`*\`, \`/\`
- **Comparison:** \`>\`, \`>=\`, \`<\`, \`<=\`, \`==\`, \`neq(a, b)\` — returns boolean
- **Grouping:** Parentheses \`(a + b) * c\`
`,
});

export interface MathLanguageDocumentationSections {
  groups: Array<{
    label: string;
    description?: string;
    items: Array<{
      label: string;
      description: { markdownContent: string; openLinksInNewTab?: boolean };
    }>;
  }>;
  initialSection: string;
}

// Section labels
const sectionLabels = {
  functions: i18n.translate('xpack.streams.math.docs.sectionFunctions', {
    defaultMessage: 'Functions',
  }),
  comparison: i18n.translate('xpack.streams.math.docs.sectionComparison', {
    defaultMessage: 'Comparison',
  }),
  howItWorks: i18n.translate('xpack.streams.math.docs.sectionHowItWorks', {
    defaultMessage: 'How it works',
  }),
};

// Helper functions
/**
 * Convert a function definition to markdown documentation
 */
function formatFunctionToMarkdown(func: MathFunctionDefinition): string {
  let markdown = `### ${func.signature}\n\n${func.description}`;

  if (func.example) {
    markdown += `\n\n**Example:** \`${func.example}\``;
  }

  return markdown;
}

/**
 * Get functions by their documentation section
 */
function getFunctionsByDocSection(section: string): MathFunctionDefinition[] {
  return ALL_MATH_FUNCTIONS.filter((f) => CATEGORY_TO_DOC_SECTION[f.category] === section);
}

/**
 * Get documentation sections formatted for LanguageDocumentationPopover.
 *
 * IMPORTANT: The LanguageDocumentationPopover expects the first group to be a navigation
 * entry for the initialSection (intro). The content pane renders groups.slice(1), so the
 * first group's items are never displayed - only its label is used for sidebar navigation
 * to scroll to the intro section.
 */
export function getMathExpressionLanguageDocSections(): MathLanguageDocumentationSections {
  return {
    initialSection: mathExpressionLanguageIntro,
    groups: [
      // First group: navigation entry for the intro section (items are NOT rendered)
      {
        label: sectionLabels.howItWorks,
        items: [], // Empty - the initialSection markdown is shown instead
      },
      // Subsequent groups: these items ARE rendered in the content pane
      {
        label: sectionLabels.functions,
        items: getFunctionsByDocSection('functions').map((func) => ({
          label: func.name,
          description: { markdownContent: formatFunctionToMarkdown(func) },
        })),
      },
      {
        label: sectionLabels.comparison,
        items: getFunctionsByDocSection('comparison').map((func) => ({
          label: func.name,
          description: { markdownContent: formatFunctionToMarkdown(func) },
        })),
      },
    ],
  };
}
