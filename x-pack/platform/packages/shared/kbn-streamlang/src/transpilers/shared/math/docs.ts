/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/**
 * Documentation for a math function supported by the math processor.
 */
export interface MathFunctionDoc {
  name: string;
  section: 'math' | 'comparison' | 'trigonometry' | 'constants';
  signature: string;
  args: Array<{ name: string; type: string; optional?: boolean; defaultValue?: string }>;
  description: string;
  example: string;
  supported: boolean;
  alternativeNote?: string;
}

/**
 * Introduction text for the math processor documentation.
 */
export const mathProcessorIntro = i18n.translate('xpack.streams.math.docsIntro', {
  defaultMessage: `## Math Expressions

Arithmetic and logical expressions that compute values from document fields.

### How it works

The math processor evaluates expressions **per document**. Each document is processed independently — values from other documents cannot be accessed and aggregations cannot be performed.

### Field References

Fields are referenced directly by name:
- Simple fields: \`bytes\`, \`duration\`
- Nested fields: \`attributes.request.duration_ms\`, \`resource.cpu.usage\`
- Special characters require quotes: \`"field-with-dashes"\`

### Operators

- **Arithmetic:** \`+\`, \`-\`, \`*\`, \`/\`, \`mod(a, b)\`
- **Comparison:** \`>\`, \`>=\`, \`<\`, \`<=\`, \`==\`, \`neq(a, b)\` — returns boolean
- **Grouping:** Parentheses \`(a + b) * c\`

### Examples

\`\`\`
# Calculate request duration in seconds
attributes.request.duration_ms / 1000

# Compute throughput (bytes per second)
resource.network.bytes_sent / attributes.elapsed_time

# Modulo operation
mod(attributes.request_id, 100)

# Boolean comparison (result stored as boolean)
resource.memory.used > resource.memory.limit * 0.9

# Complex expression with functions
round(sqrt(pow(attributes.x, 2) + pow(attributes.y, 2)), 2)
\`\`\`
`,
});

/**
 * Documentation for all math functions.
 */
export const mathFunctionDocs: MathFunctionDoc[] = [
  // === MATH FUNCTIONS ===
  {
    name: 'abs',
    section: 'math',
    signature: 'abs(value)',
    args: [{ name: 'value', type: 'number' }],
    description: i18n.translate('xpack.streams.math.docs.abs', {
      defaultMessage:
        'Calculates absolute value. Negative values are multiplied by -1; positive values remain unchanged.',
    }),
    example: 'abs(attributes.temperature_delta)',
    supported: true,
  },
  {
    name: 'ceil',
    section: 'math',
    signature: 'ceil(value)',
    args: [{ name: 'value', type: 'number' }],
    description: i18n.translate('xpack.streams.math.docs.ceil', {
      defaultMessage: 'Rounds up to the nearest integer.',
    }),
    example: 'ceil(attributes.price)',
    supported: true,
  },
  {
    name: 'floor',
    section: 'math',
    signature: 'floor(value)',
    args: [{ name: 'value', type: 'number' }],
    description: i18n.translate('xpack.streams.math.docs.floor', {
      defaultMessage: 'Rounds down to the nearest integer.',
    }),
    example: 'floor(attributes.duration_ms / 1000)',
    supported: true,
  },
  {
    name: 'round',
    section: 'math',
    signature: 'round(value, [decimals])',
    args: [
      { name: 'value', type: 'number' },
      { name: 'decimals', type: 'number', optional: true, defaultValue: '0' },
    ],
    description: i18n.translate('xpack.streams.math.docs.round', {
      defaultMessage: 'Rounds to a specific number of decimal places. Defaults to 0.',
    }),
    example: 'round(attributes.cpu_percent, 2)',
    supported: true,
  },
  {
    name: 'sqrt',
    section: 'math',
    signature: 'sqrt(value)',
    args: [{ name: 'value', type: 'number' }],
    description: i18n.translate('xpack.streams.math.docs.sqrt', {
      defaultMessage: 'Calculates the square root. Returns null for negative values.',
    }),
    example: 'sqrt(pow(attributes.x, 2) + pow(attributes.y, 2))',
    supported: true,
  },
  {
    name: 'cbrt',
    section: 'math',
    signature: 'cbrt(value)',
    args: [{ name: 'value', type: 'number' }],
    description: i18n.translate('xpack.streams.math.docs.cbrt', {
      defaultMessage: 'Calculates the cube root of a value.',
    }),
    example: 'cbrt(attributes.volume)',
    supported: true,
  },
  {
    name: 'pow',
    section: 'math',
    signature: 'pow(base, exponent)',
    args: [
      { name: 'base', type: 'number' },
      { name: 'exponent', type: 'number' },
    ],
    description: i18n.translate('xpack.streams.math.docs.pow', {
      defaultMessage: 'Raises the base to the power of the exponent.',
    }),
    example: 'pow(attributes.side_length, 3)',
    supported: true,
  },
  {
    name: 'log',
    section: 'math',
    signature: 'log(value, [base])',
    args: [
      { name: 'value', type: 'number' },
      { name: 'base', type: 'number', optional: true, defaultValue: 'e' },
    ],
    description: i18n.translate('xpack.streams.math.docs.log', {
      defaultMessage: 'Logarithm with optional base. Natural log (base e) is the default.',
    }),
    example: 'log(attributes.bytes, 2)',
    supported: true,
  },
  {
    name: 'exp',
    section: 'math',
    signature: 'exp(value)',
    args: [{ name: 'value', type: 'number' }],
    description: i18n.translate('xpack.streams.math.docs.exp', {
      defaultMessage: "Raises e (Euler's number) to the power of value.",
    }),
    example: 'exp(attributes.growth_rate)',
    supported: true,
  },
  {
    name: 'mod',
    section: 'math',
    signature: 'mod(value, divisor)',
    args: [
      { name: 'value', type: 'number' },
      { name: 'divisor', type: 'number' },
    ],
    description: i18n.translate('xpack.streams.math.docs.mod', {
      defaultMessage:
        'Returns the remainder after division (modulo operation). Equivalent to the % operator.',
    }),
    example: 'mod(attributes.request_id, 100)',
    supported: true,
  },
  {
    name: 'signum',
    section: 'math',
    signature: 'signum(value)',
    args: [{ name: 'value', type: 'number' }],
    description: i18n.translate('xpack.streams.math.docs.signum', {
      defaultMessage: 'Returns the sign of the value: -1 for negative, 0 for zero, 1 for positive.',
    }),
    example: 'signum(attributes.delta)',
    supported: true,
  },
  {
    name: 'log_ten',
    section: 'math',
    signature: 'log_ten(value)',
    args: [{ name: 'value', type: 'number' }],
    description: i18n.translate('xpack.streams.math.docs.logTen', {
      defaultMessage: 'Returns the base-10 logarithm of a value.',
    }),
    example: 'log_ten(attributes.bytes)',
    supported: true,
  },
  {
    name: 'hypot',
    section: 'math',
    signature: 'hypot(x, y)',
    args: [
      { name: 'x', type: 'number' },
      { name: 'y', type: 'number' },
    ],
    description: i18n.translate('xpack.streams.math.docs.hypot', {
      defaultMessage: 'Returns the hypotenuse: sqrt(x² + y²). Useful for calculating distances.',
    }),
    example: 'hypot(attributes.delta_x, attributes.delta_y)',
    supported: true,
  },

  // === COMPARISON FUNCTIONS ===
  {
    name: 'eq',
    section: 'comparison',
    signature: 'eq(left, right)',
    args: [
      { name: 'left', type: 'number' },
      { name: 'right', type: 'number' },
    ],
    description: i18n.translate('xpack.streams.math.docs.eq', {
      defaultMessage:
        'Returns true if values are equal, false otherwise. Equivalent to the == operator.',
    }),
    example: 'eq(attributes.status_code, 200)',
    supported: true,
  },
  {
    name: 'neq',
    section: 'comparison',
    signature: 'neq(left, right)',
    args: [
      { name: 'left', type: 'number' },
      { name: 'right', type: 'number' },
    ],
    description: i18n.translate('xpack.streams.math.docs.neq', {
      defaultMessage:
        'Returns true if values are not equal, false otherwise. Use this function for inequality checks (the != operator is not supported).',
    }),
    example: 'neq(attributes.error_count, 0)',
    supported: true,
  },
  {
    name: 'gt',
    section: 'comparison',
    signature: 'gt(left, right)',
    args: [
      { name: 'left', type: 'number' },
      { name: 'right', type: 'number' },
    ],
    description: i18n.translate('xpack.streams.math.docs.gt', {
      defaultMessage:
        'Returns true if left > right, false otherwise. Equivalent to the > operator.',
    }),
    example: 'gt(attributes.response_time_ms, 1000)',
    supported: true,
  },
  {
    name: 'gte',
    section: 'comparison',
    signature: 'gte(left, right)',
    args: [
      { name: 'left', type: 'number' },
      { name: 'right', type: 'number' },
    ],
    description: i18n.translate('xpack.streams.math.docs.gte', {
      defaultMessage:
        'Returns true if left >= right, false otherwise. Equivalent to the >= operator.',
    }),
    example: 'gte(attributes.memory_percent, 90)',
    supported: true,
  },
  {
    name: 'lt',
    section: 'comparison',
    signature: 'lt(left, right)',
    args: [
      { name: 'left', type: 'number' },
      { name: 'right', type: 'number' },
    ],
    description: i18n.translate('xpack.streams.math.docs.lt', {
      defaultMessage:
        'Returns true if left < right, false otherwise. Equivalent to the < operator.',
    }),
    example: 'lt(attributes.queue_depth, 10)',
    supported: true,
  },
  {
    name: 'lte',
    section: 'comparison',
    signature: 'lte(left, right)',
    args: [
      { name: 'left', type: 'number' },
      { name: 'right', type: 'number' },
    ],
    description: i18n.translate('xpack.streams.math.docs.lte', {
      defaultMessage:
        'Returns true if left <= right, false otherwise. Equivalent to the <= operator.',
    }),
    example: 'lte(attributes.retry_count, 3)',
    supported: true,
  },

  // === TRIGONOMETRY ===
  {
    name: 'sin',
    section: 'trigonometry',
    signature: 'sin(angle)',
    args: [{ name: 'angle', type: 'number (radians)' }],
    description: i18n.translate('xpack.streams.math.docs.sin', {
      defaultMessage: 'Returns the sine of an angle specified in radians.',
    }),
    example: 'sin(attributes.rotation_angle)',
    supported: true,
  },
  {
    name: 'cos',
    section: 'trigonometry',
    signature: 'cos(angle)',
    args: [{ name: 'angle', type: 'number (radians)' }],
    description: i18n.translate('xpack.streams.math.docs.cos', {
      defaultMessage: 'Returns the cosine of an angle specified in radians.',
    }),
    example: 'cos(attributes.heading)',
    supported: true,
  },
  {
    name: 'tan',
    section: 'trigonometry',
    signature: 'tan(angle)',
    args: [{ name: 'angle', type: 'number (radians)' }],
    description: i18n.translate('xpack.streams.math.docs.tan', {
      defaultMessage: 'Returns the tangent of an angle specified in radians.',
    }),
    example: 'tan(attributes.slope)',
    supported: true,
  },
  // Inverse trigonometric functions
  {
    name: 'asin',
    section: 'trigonometry',
    signature: 'asin(value)',
    args: [{ name: 'value', type: 'number (-1 to 1)' }],
    description: i18n.translate('xpack.streams.math.docs.asin', {
      defaultMessage: 'Returns the arc sine (inverse sine) in radians.',
    }),
    example: 'asin(attributes.ratio)',
    supported: true,
  },
  {
    name: 'acos',
    section: 'trigonometry',
    signature: 'acos(value)',
    args: [{ name: 'value', type: 'number (-1 to 1)' }],
    description: i18n.translate('xpack.streams.math.docs.acos', {
      defaultMessage: 'Returns the arc cosine (inverse cosine) in radians.',
    }),
    example: 'acos(attributes.ratio)',
    supported: true,
  },
  {
    name: 'atan',
    section: 'trigonometry',
    signature: 'atan(value)',
    args: [{ name: 'value', type: 'number' }],
    description: i18n.translate('xpack.streams.math.docs.atan', {
      defaultMessage: 'Returns the arc tangent (inverse tangent) in radians.',
    }),
    example: 'atan(attributes.slope)',
    supported: true,
  },
  {
    name: 'atan_two',
    section: 'trigonometry',
    signature: 'atan_two(y, x)',
    args: [
      { name: 'y', type: 'number' },
      { name: 'x', type: 'number' },
    ],
    description: i18n.translate('xpack.streams.math.docs.atanTwo', {
      defaultMessage:
        'Returns the angle in radians between the positive x-axis and the point (x, y). Handles all quadrants correctly.',
    }),
    example: 'atan_two(attributes.delta_y, attributes.delta_x)',
    supported: true,
  },
  // Hyperbolic functions
  {
    name: 'sinh',
    section: 'trigonometry',
    signature: 'sinh(value)',
    args: [{ name: 'value', type: 'number' }],
    description: i18n.translate('xpack.streams.math.docs.sinh', {
      defaultMessage: 'Returns the hyperbolic sine of a value.',
    }),
    example: 'sinh(attributes.x)',
    supported: true,
  },
  {
    name: 'cosh',
    section: 'trigonometry',
    signature: 'cosh(value)',
    args: [{ name: 'value', type: 'number' }],
    description: i18n.translate('xpack.streams.math.docs.cosh', {
      defaultMessage: 'Returns the hyperbolic cosine of a value.',
    }),
    example: 'cosh(attributes.x)',
    supported: true,
  },
  {
    name: 'tanh',
    section: 'trigonometry',
    signature: 'tanh(value)',
    args: [{ name: 'value', type: 'number' }],
    description: i18n.translate('xpack.streams.math.docs.tanh', {
      defaultMessage: 'Returns the hyperbolic tangent of a value.',
    }),
    example: 'tanh(attributes.x)',
    supported: true,
  },

  // === CONSTANTS ===
  {
    name: 'pi',
    section: 'constants',
    signature: 'pi()',
    args: [],
    description: i18n.translate('xpack.streams.math.docs.pi', {
      defaultMessage: 'Returns the value of π (3.14159...).',
    }),
    example: 'attributes.radius * attributes.radius * pi()',
    supported: true,
  },
  {
    name: 'e',
    section: 'constants',
    signature: 'e()',
    args: [],
    description: i18n.translate('xpack.streams.math.docs.e', {
      defaultMessage: "Returns Euler's number e (2.71828...).",
    }),
    example: 'pow(e(), attributes.exponent)',
    supported: true,
  },
  {
    name: 'tau',
    section: 'constants',
    signature: 'tau()',
    args: [],
    description: i18n.translate('xpack.streams.math.docs.tau', {
      defaultMessage:
        'Returns τ (tau), equal to 2π (6.28318...). The ratio of circumference to radius.',
    }),
    example: 'attributes.radius * tau()',
    supported: true,
  },
];

/**
 * Documentation section structure for the UI.
 */
export interface MathDocSection {
  title: string;
  subtitle?: string;
  functions: MathFunctionDoc[];
  isUnsupported?: boolean;
}

/**
 * Get documentation sections organized for the UI.
 */
export function getMathDocumentationSections(): {
  intro: string;
  sections: MathDocSection[];
} {
  const supported = mathFunctionDocs.filter((f) => f.supported);

  return {
    intro: mathProcessorIntro,
    sections: [
      {
        title: i18n.translate('xpack.streams.math.docs.sectionMath', {
          defaultMessage: 'Math Functions',
        }),
        functions: supported.filter((f) => f.section === 'math'),
      },
      {
        title: i18n.translate('xpack.streams.math.docs.sectionComparison', {
          defaultMessage: 'Comparison Operators',
        }),
        functions: supported.filter((f) => f.section === 'comparison'),
      },
      {
        title: i18n.translate('xpack.streams.math.docs.sectionTrigonometry', {
          defaultMessage: 'Trigonometry',
        }),
        functions: supported.filter((f) => f.section === 'trigonometry'),
      },
      {
        title: i18n.translate('xpack.streams.math.docs.sectionConstants', {
          defaultMessage: 'Constants',
        }),
        functions: supported.filter((f) => f.section === 'constants'),
      },
    ],
  };
}

/**
 * Format documentation for LanguageDocumentationPopover (from @kbn/language-documentation).
 * This format is used by the Lens formula editor popover.
 */
export interface MathLanguageDocumentationSections {
  groups: Array<{
    label: string;
    description?: string;
    items: Array<{
      label: string;
      description: { markdownContent: string; openLinksInNewTab?: boolean };
    }>;
  }>;
  initialSection: string; // Markdown content for the intro
}

function formatFunctionToMarkdown(func: MathFunctionDoc): string {
  let markdown = `### ${func.signature}\n\n${func.description}`;

  if (func.example) {
    markdown += `\n\n**Example:** \`${func.example}\``;
  }

  if (func.alternativeNote) {
    markdown += `\n\n*${func.alternativeNote}*`;
  }

  return markdown;
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
  const supported = mathFunctionDocs.filter((f) => f.supported);

  return {
    initialSection: mathProcessorIntro,
    groups: [
      // First group: navigation entry for the intro section (items are NOT rendered)
      {
        label: i18n.translate('xpack.streams.math.docs.sectionHowItWorks', {
          defaultMessage: 'How it works',
        }),
        items: [], // Empty - the initialSection markdown is shown instead
      },
      // Subsequent groups: these items ARE rendered in the content pane
      {
        label: i18n.translate('xpack.streams.math.docs.sectionMath', {
          defaultMessage: 'Math Functions',
        }),
        items: supported
          .filter((f) => f.section === 'math')
          .map((func) => ({
            label: func.name,
            description: { markdownContent: formatFunctionToMarkdown(func) },
          })),
      },
      {
        label: i18n.translate('xpack.streams.math.docs.sectionComparison', {
          defaultMessage: 'Comparison Operators',
        }),
        items: supported
          .filter((f) => f.section === 'comparison')
          .map((func) => ({
            label: func.name,
            description: { markdownContent: formatFunctionToMarkdown(func) },
          })),
      },
      {
        label: i18n.translate('xpack.streams.math.docs.sectionTrigonometry', {
          defaultMessage: 'Trigonometry',
        }),
        items: supported
          .filter((f) => f.section === 'trigonometry')
          .map((func) => ({
            label: func.name,
            description: { markdownContent: formatFunctionToMarkdown(func) },
          })),
      },
      {
        label: i18n.translate('xpack.streams.math.docs.sectionConstants', {
          defaultMessage: 'Constants',
        }),
        items: supported
          .filter((f) => f.section === 'constants')
          .map((func) => ({
            label: func.name,
            description: { markdownContent: formatFunctionToMarkdown(func) },
          })),
      },
    ],
  };
}
