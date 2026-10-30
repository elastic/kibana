/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'yaml';

import {
  ChangeType,
  getBreakingChangesInRange,
  parseYamlChangelog,
  type Changelog,
} from './changelog_utils';

describe('parseYamlChangelog', () => {
  const changelogText = `
- version: "2.4.0"
  changes:
    - description: Update package to ECS 8.6.0.
      type: enhancement
      link: https://github.com/elastic/integrations/pull/4576
- version: "2.3.0"
  changes:
    - description: Added support for GCS input.
      type: enhancement
      link: https://github.com/elastic/integrations/pull/4728
- version: "2.2.0"
  changes:
    - description: Update package to ECS 8.5.0.
      type: enhancement
      link: https://github.com/elastic/integrations/pull/4285
- version: "2.1.2"
  changes:
    - description: Remove duplicate fields.
      type: bugfix
      link: https://github.com/elastic/integrations/pull/4399`;

  it('should return the changelog from latest to current version', () => {
    expect(parseYamlChangelog(parse, changelogText, `2.4.0`, `2.2.0`)).toEqual([
      {
        version: '2.4.0',
        changes: [
          {
            description: 'Update package to ECS 8.6.0.',
            link: 'https://github.com/elastic/integrations/pull/4576',
            type: 'enhancement',
          },
        ],
      },
      {
        version: '2.3.0',
        changes: [
          {
            description: 'Added support for GCS input.',
            link: 'https://github.com/elastic/integrations/pull/4728',
            type: 'enhancement',
          },
        ],
      },
      {
        version: '2.2.0',
        changes: [
          {
            description: 'Update package to ECS 8.5.0.',
            link: 'https://github.com/elastic/integrations/pull/4285',
            type: 'enhancement',
          },
        ],
      },
    ]);
  });

  it('should return the changelog to latest version when there is no current version defined', () => {
    expect(parseYamlChangelog(parse, changelogText, `2.4.0`)).toEqual([
      {
        version: '2.4.0',
        changes: [
          {
            description: 'Update package to ECS 8.6.0.',
            link: 'https://github.com/elastic/integrations/pull/4576',
            type: 'enhancement',
          },
        ],
      },
      {
        version: '2.3.0',
        changes: [
          {
            description: 'Added support for GCS input.',
            link: 'https://github.com/elastic/integrations/pull/4728',
            type: 'enhancement',
          },
        ],
      },
      {
        version: '2.2.0',
        changes: [
          {
            description: 'Update package to ECS 8.5.0.',
            link: 'https://github.com/elastic/integrations/pull/4285',
            type: 'enhancement',
          },
        ],
      },
      {
        version: '2.1.2',
        changes: [
          {
            description: 'Remove duplicate fields.',
            link: 'https://github.com/elastic/integrations/pull/4399',
            type: 'bugfix',
          },
        ],
      },
    ]);
  });

  it('should return empty array if changelog text is undefined', () => {
    expect(parseYamlChangelog(parse, undefined, `2.4.0`, `2.2.0`)).toEqual([]);
  });
  it('should return empty array if changelog text is null', () => {
    expect(parseYamlChangelog(parse, null, `2.4.0`, `2.2.0`)).toEqual([]);
  });
});

describe('getBreakingChangesInRange', () => {
  const changelog: Changelog = [
    {
      version: '3.0.0',
      changes: [
        {
          description: 'Breaking 3.0.0',
          link: 'https://link/300',
          type: ChangeType.BreakingChange,
        },
        {
          description: 'Enhancement 3.0.0',
          link: 'https://link/300e',
          type: ChangeType.Enhancement,
        },
      ],
    },
    {
      version: '2.1.0',
      changes: [{ description: 'Bugfix 2.1.0', link: 'https://link/210', type: ChangeType.BugFix }],
    },
    {
      version: '2.0.0',
      changes: [
        {
          description: 'Breaking 2.0.0',
          link: 'https://link/200',
          type: ChangeType.BreakingChange,
        },
      ],
    },
    {
      version: 'not-a-version',
      changes: [
        { description: 'Invalid version', link: 'https://link/x', type: ChangeType.BreakingChange },
      ],
    },
  ];

  it('should exclude the from version and include the to version', () => {
    expect(getBreakingChangesInRange(changelog, '2.0.0', '3.0.0')).toEqual([
      {
        version: '3.0.0',
        changes: [
          {
            description: 'Breaking 3.0.0',
            link: 'https://link/300',
            type: ChangeType.BreakingChange,
          },
        ],
      },
    ]);
  });

  it('should return all breaking changes of the range', () => {
    expect(
      getBreakingChangesInRange(changelog, '1.0.0', '3.0.0').map(({ version }) => version)
    ).toEqual(['3.0.0', '2.0.0']);
  });

  it('should return an empty array when the range has no breaking changes', () => {
    expect(getBreakingChangesInRange(changelog, '2.0.0', '2.1.0')).toEqual([]);
  });

  it('should return an empty array for a changelog that is not an array', () => {
    expect(
      getBreakingChangesInRange({ foo: 'bar' } as unknown as Changelog, '1.0.0', '3.0.0')
    ).toEqual([]);
  });
});
