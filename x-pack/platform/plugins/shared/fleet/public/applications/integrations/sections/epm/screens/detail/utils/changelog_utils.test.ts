/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filterYamlChangelog } from '.';

describe('filterYamlChangelog', () => {
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
    expect(filterYamlChangelog(changelogText, `2.4.0`, `2.2.0`)).toEqual([
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
    expect(filterYamlChangelog(changelogText, `2.4.0`)).toEqual([
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
    expect(filterYamlChangelog(undefined, `2.4.0`, `2.2.0`)).toEqual([]);
  });
  it('should return empty array if changelog text is null', () => {
    expect(filterYamlChangelog(null, `2.4.0`, `2.2.0`)).toEqual([]);
  });
});
