/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface Snippet {
  uri: string;
  filePath: string;
  language?: string;
  compositeContent: {
    content: string;
    lineMapping: string[];
  };
}

export type Results = Record<string, Snippet>;

export const results: Results = {
  'ringside.ts#L18': {
    uri: 'github.com/rylnd/ringside',
    filePath: 'src/ringside.ts',
    language: 'typescript',
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
    },
  },
  'ringside.story.tsx#L12': {
    uri: 'github.com/rylnd/ringside',
    filePath: 'stories/ringside.story.tsx',
    language: 'typescript',
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
    },
  },

  'ringside.story.tsx#L8': {
    uri: 'github.com/rylnd/ringside',
    filePath: 'stories/ringside.story.tsx',
    language: 'typescript',
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
    },
  },

  'ringside.story.tsx#L14': {
    uri: 'github.com/rylnd/ringside',
    filePath: 'stories/ringside.story.tsx',
    language: 'typescript',
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
