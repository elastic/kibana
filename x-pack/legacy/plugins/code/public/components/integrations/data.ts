/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface Snippet {
  uri: string;
  filePath: string;
  language?: string;
  hits: number;
  compositeContent: {
    content: string;
    lineMapping: string[];
    ranges: Array<{
      startColumn: number;
      startLineNumber: number;
      endColumn: number;
      endLineNumber: number;
    }>;
  };
}

export type Results = Record<string, Snippet>;

export const results: Results = {
  'ringside.ts#L18': {
    uri: 'github.com/rylnd/ringside',
    filePath: 'src/ringside.ts',
    language: 'typescript',
    hits: 4,
    compositeContent: {
      content:
        "\nimport { fitsInside, fitsOutside } from './fitting';\n\nexport interface RingsideInterface {\n  positions(): FittedPosition[];\n}\n\nclass Ringside implements RingsideInterface {\n  readonly innerBounds: FullRect;\n  readonly outerBounds: FullRect;\n\n}\n\nexport default Ringside;\n",
      lineMapping: [
        '..',
        '13',
        '14',
        '15',
        '16',
        '17',
        '18',
        '19',
        '20',
        '21',
        '..',
        '67',
        '68',
        '69',
        '70',
      ],
      ranges: [
        {
          startColumn: 18,
          startLineNumber: 4,
          endColumn: 26,
          endLineNumber: 4,
        },
        {
          startColumn: 7,
          startLineNumber: 8,
          endColumn: 15,
          endLineNumber: 8,
        },
        {
          startColumn: 27,
          startLineNumber: 8,
          endColumn: 35,
          endLineNumber: 8,
        },
        {
          startColumn: 16,
          startLineNumber: 14,
          endColumn: 24,
          endLineNumber: 14,
        },
      ],
    },
  },
  'ringside.story.tsx#L12': {
    uri: 'github.com/rylnd/ringside',
    filePath: 'stories/ringside.story.tsx',
    language: 'typescript',
    hits: 11,
    compositeContent: {
      content:
        "\nimport { interpolateRainbow } from 'd3-scale-chromatic';\n\nimport { Ringside } from '../src';\nimport { XAlignment, YAlignment, XBasis, YBasis } from '../src/types';\n\nlet ringside: Ringside;\n\nconst enumKeys: (e: any) => string[] = e =>\n\n\nconst color = position => {\n  const combos = ringside.positions().map(p => JSON.stringify(p));\n  const hash = combos.indexOf(JSON.stringify(position)) / combos.length;\n\n\n};\n\nconst Stories = storiesOf('Ringside', module).addDecorator(withKnobs);\n\nStories.add('Ringside', () => {\n",
      lineMapping: [
        '..',
        '5',
        '6',
        '7',
        '8',
        '9',
        '10',
        '11',
        '12',
        '..',
        '14',
        '15',
        '16',
        '17',
        '18',
        '..',
        '20',
        '21',
        '22',
        '23',
        '24',
        '..',
      ],
      ranges: [
        {
          startColumn: 10,
          startLineNumber: 4,
          endColumn: 18,
          endLineNumber: 4,
        },
        {
          startColumn: 5,
          startLineNumber: 7,
          endColumn: 13,
          endLineNumber: 7,
        },
        {
          startColumn: 15,
          startLineNumber: 7,
          endColumn: 23,
          endLineNumber: 7,
        },
        {
          startColumn: 18,
          startLineNumber: 13,
          endColumn: 26,
          endLineNumber: 13,
        },
        {
          startColumn: 28,
          startLineNumber: 19,
          endColumn: 36,
          endLineNumber: 19,
        },
        {
          startColumn: 14,
          startLineNumber: 21,
          endColumn: 22,
          endLineNumber: 21,
        },
      ],
    },
  },

  'ringside.story.tsx#L8': {
    uri: 'github.com/rylnd/ringside',
    filePath: 'stories/ringside.story.tsx',
    language: 'typescript',
    hits: 7,
    compositeContent: {
      content:
        "import { Ringside } from '../src';\n\ndescribe('Ringside', () => {\n  let inner;\n  let outer;\n  let height;\n  let width;\n  let ringside: Ringside;\n\n  beforeEach(() => {\n\n    width = 50;\n\n    ringside = new Ringside(inner, outer, height, width);\n  });\n\n",
      lineMapping: [
        '1',
        '2',
        '3',
        '4',
        '5',
        '6',
        '7',
        '8',
        '9',
        '10',
        '..',
        '14',
        '15',
        '16',
        '17',
        '18',
        '..',
      ],
      ranges: [
        {
          startColumn: 10,
          startLineNumber: 1,
          endColumn: 18,
          endLineNumber: 1,
        },
        {
          startColumn: 11,
          startLineNumber: 3,
          endColumn: 19,
          endLineNumber: 3,
        },
        {
          startColumn: 7,
          startLineNumber: 8,
          endColumn: 15,
          endLineNumber: 8,
        },
        {
          startColumn: 17,
          startLineNumber: 8,
          endColumn: 25,
          endLineNumber: 8,
        },
        {
          startColumn: 5,
          startLineNumber: 14,
          endColumn: 13,
          endLineNumber: 14,
        },
        {
          startColumn: 20,
          startLineNumber: 14,
          endColumn: 28,
          endLineNumber: 14,
        },
      ],
    },
  },

  'ringside.story.tsx#L14': {
    uri: 'github.com/rylnd/ringside',
    filePath: 'stories/ringside.story.tsx',
    language: 'typescript',
    hits: 7,
    compositeContent: {
      content:
        "import { Ringside } from '../src';\n\ndescribe('Ringside', () => {\n  let inner;\n  let outer;\n  let height;\n  let width;\n  let ringside: Ringside;\n\n  beforeEach(() => {\n\n    width = 50;\n\n    ringside = new Ringside(inner, outer, height, width);\n  });\n\n",
      lineMapping: [
        '1',
        '2',
        '3',
        '4',
        '5',
        '6',
        '7',
        '8',
        '9',
        '10',
        '..',
        '14',
        '15',
        '16',
        '17',
        '18',
        '..',
      ],
      ranges: [
        {
          startColumn: 10,
          startLineNumber: 1,
          endColumn: 18,
          endLineNumber: 1,
        },
        {
          startColumn: 11,
          startLineNumber: 3,
          endColumn: 19,
          endLineNumber: 3,
        },
        {
          startColumn: 7,
          startLineNumber: 8,
          endColumn: 15,
          endLineNumber: 8,
        },
        {
          startColumn: 17,
          startLineNumber: 8,
          endColumn: 25,
          endLineNumber: 8,
        },
        {
          startColumn: 5,
          startLineNumber: 14,
          endColumn: 13,
          endLineNumber: 14,
        },
        {
          startColumn: 20,
          startLineNumber: 14,
          endColumn: 28,
          endLineNumber: 14,
        },
      ],
    },
  },
};

export interface Frame {
  fileName: string;
  lineNumber: number;
  functionName?: string;
}

export const frames: Frame[] = [
  { fileName: 'ringside.ts', lineNumber: 18 },
  { fileName: 'node_modules/library_code.js', lineNumber: 100 },
  { fileName: 'ringside.story.tsx', lineNumber: 8 },
  { fileName: 'node_modules/other_stuff.js', lineNumber: 58 },
  { fileName: 'node_modules/other/other.js', lineNumber: 3 },
  { fileName: 'ringside.story.tsx', lineNumber: 12 },
  { fileName: 'ringside.story.tsx', lineNumber: 14 },
];

export const repos = [
  'https://github.com/a/repo',
  'https://github.com/another/repo',
  'https://github.com/also/a_repo',
];
