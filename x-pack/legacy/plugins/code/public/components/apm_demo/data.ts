export type Frame = {
  uri: string;
  filePath: string;
  language?: string;
  hits: number;
  compositeContent: {
    content: string;
    lineMapping: string[];
    ranges: {
      startColumn: number;
      startLineNumber: number;
      endColumn: number;
      endLineNumber: number;
    }[];
  };
};

export const frames: Frame[] = [
  {
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
  {
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
  {
    uri: 'github.com/rylnd/ringside',
    filePath: 'test/ringside.test.ts',
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
  {
    uri: 'github.com/rylnd/ringside',
    filePath: 'src/index.ts',
    language: 'typescript',
    hits: 2,
    compositeContent: {
      content:
        "export { default, default as Ringside } from './ringside';\nexport { default as Position } from './position';\nexport { default as Grid } from './grid';\n",
      lineMapping: ['1', '2', '3', '..'],
      ranges: [
        {
          startColumn: 30,
          startLineNumber: 1,
          endColumn: 38,
          endLineNumber: 1,
        },
        {
          startColumn: 49,
          startLineNumber: 1,
          endColumn: 57,
          endLineNumber: 1,
        },
      ],
    },
  },
  {
    uri: 'github.com/rylnd/ringside',
    filePath: 'CHANGELOG.md',
    language: 'markdown',
    hits: 15,
    compositeContent: {
      content:
        '\n\n<a name="1.0.1"></a>\n## [1.0.1](https://github.com/rylnd/ringside/compare/v1.0.0...v1.0.1) (2018-12-16)\n\n\n### Bug Fixes\n\n* **vulnerabilities:** Update dependencies ([246eb4f](https://github.com/rylnd/ringside/commit/246eb4f))\n* Upgraded everything ([aa44f17](https://github.com/rylnd/ringside/commit/aa44f17))\n\n\n\n<a name="1.0.0"></a>\n# [1.0.0](https://github.com/rylnd/ringside/compare/v0.2.0...v1.0.0) (2018-12-14)\n\n\n\n<a name="0.2.0"></a>\n# [0.2.0](https://github.com/rylnd/ringside/compare/v0.1.1...v0.2.0) (2017-12-20)\n\n\n',
      lineMapping: [
        '..',
        '4',
        '5',
        '6',
        '7',
        '8',
        '9',
        '10',
        '11',
        '12',
        '13',
        '14',
        '15',
        '16',
        '17',
        '18',
        '19',
        '20',
        '21',
        '22',
        '23',
        '24',
        '..',
      ],
      ranges: [
        {
          startColumn: 37,
          startLineNumber: 4,
          endColumn: 45,
          endLineNumber: 4,
        },
        {
          startColumn: 80,
          startLineNumber: 9,
          endColumn: 88,
          endLineNumber: 9,
        },
        {
          startColumn: 59,
          startLineNumber: 10,
          endColumn: 67,
          endLineNumber: 10,
        },
        {
          startColumn: 36,
          startLineNumber: 15,
          endColumn: 44,
          endLineNumber: 15,
        },
        {
          startColumn: 36,
          startLineNumber: 20,
          endColumn: 44,
          endLineNumber: 20,
        },
      ],
    },
  },
  {
    uri: 'github.com/rylnd/ringside',
    filePath: 'README.md',
    language: 'markdown',
    hits: 10,
    compositeContent: {
      content:
        "# ringside [![CircleCI](https://circleci.com/gh/rylnd/ringside.svg?style=svg)](https://circleci.com/gh/rylnd/ringside)\n\nA library that determines the fit and positioning of a rectangle relative to inner and outer bounds.\n\n\n```bash\nnpm install ringside\n```\n\n\n\n```jsx\nimport Ringside from 'ringside';\n\n// define our target tooltip size\n",
      lineMapping: [
        '1',
        '2',
        '3',
        '..',
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
          startColumn: 3,
          startLineNumber: 1,
          endColumn: 11,
          endLineNumber: 1,
        },
        {
          startColumn: 55,
          startLineNumber: 1,
          endColumn: 63,
          endLineNumber: 1,
        },
        {
          startColumn: 110,
          startLineNumber: 1,
          endColumn: 118,
          endLineNumber: 1,
        },
        {
          startColumn: 13,
          startLineNumber: 7,
          endColumn: 21,
          endLineNumber: 7,
        },
        {
          startColumn: 8,
          startLineNumber: 13,
          endColumn: 16,
          endLineNumber: 13,
        },
        {
          startColumn: 23,
          startLineNumber: 13,
          endColumn: 31,
          endLineNumber: 13,
        },
      ],
    },
  },
  {
    uri: 'github.com/rylnd/ringside',
    filePath: 'package.json',
    language: undefined,
    hits: 4,
    compositeContent: {
      content:
        '{\n  "name": "ringside",\n  "version": "1.0.1",\n  "description": "Positions a rectangle between inner and outer bounds",\n\n  "repository": {\n    "type": "git",\n    "url": "git+https://github.com/rylnd/ringside.git"\n  },\n  "bugs": {\n    "url": "https://github.com/rylnd/ringside/issues"\n  },\n  "homepage": "https://github.com/rylnd/ringside#readme"\n}\n',
      lineMapping: [
        '1',
        '2',
        '3',
        '4',
        '..',
        '63',
        '64',
        '65',
        '66',
        '67',
        '68',
        '69',
        '70',
        '71',
        '72',
      ],
      ranges: [
        {
          startColumn: 12,
          startLineNumber: 2,
          endColumn: 20,
          endLineNumber: 2,
        },
        {
          startColumn: 42,
          startLineNumber: 8,
          endColumn: 50,
          endLineNumber: 8,
        },
        {
          startColumn: 38,
          startLineNumber: 11,
          endColumn: 46,
          endLineNumber: 11,
        },
        {
          startColumn: 41,
          startLineNumber: 13,
          endColumn: 49,
          endLineNumber: 13,
        },
      ],
    },
  },
  {
    uri: 'github.com/rylnd/ringside',
    filePath: 'webpack.config.js',
    language: 'javascript',
    hits: 2,
    compositeContent: {
      content:
        "\n  target: 'node',\n  output: {\n    library: 'ringside',\n    libraryTarget: 'umd',\n    filename: 'index.js',\n\n  target: 'web',\n  output: {\n    library: 'ringside',\n    libraryTarget: 'umd',\n    filename: 'index.browser.js',\n",
      lineMapping: ['..', '35', '36', '37', '38', '39', '..', '46', '47', '48', '49', '50', '..'],
      ranges: [
        {
          startColumn: 15,
          startLineNumber: 4,
          endColumn: 23,
          endLineNumber: 4,
        },
        {
          startColumn: 15,
          startLineNumber: 10,
          endColumn: 23,
          endLineNumber: 10,
        },
      ],
    },
  },
  {
    uri: 'github.com/rylnd/ringside',
    filePath: 'package-lock.json',
    language: undefined,
    hits: 1,
    compositeContent: {
      content: '{\n  "name": "ringside",\n  "version": "1.0.1",\n  "lockfileVersion": 1,\n',
      lineMapping: ['1', '2', '3', '4', '..'],
      ranges: [
        {
          startColumn: 12,
          startLineNumber: 2,
          endColumn: 20,
          endLineNumber: 2,
        },
      ],
    },
  },
];

export const repos = [
  'https://github.com/a/repo',
  'https://github.com/another/repo',
  'https://github.com/also/a_repo',
];
