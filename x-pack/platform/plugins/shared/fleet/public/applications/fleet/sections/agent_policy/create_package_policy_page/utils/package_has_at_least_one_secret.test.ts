/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { packageHasAtLeastOneSecret } from './package_has_at_least_one_secret';

describe('packageHasAtLeastOneSecret', () => {
  it('returns true if packageInfo has package level secret', () => {
    const packageInfo = {
      vars: [
        {
          name: 'secretVar',
          secret: true,
        },
      ],
    } as any;

    expect(packageHasAtLeastOneSecret({ packageInfo })).toBe(true);
  });

  it('returns true for input package if packageInfo has policy template level secret', () => {
    const packageInfo = {
      policy_templates: [
        {
          input: 'input1',
          vars: [
            {
              name: 'secretVar',
              secret: true,
            },
          ],
        },
      ],
    } as any;

    expect(packageHasAtLeastOneSecret({ packageInfo })).toBe(true);
  });

  it('returns true if packageInfo has input level secret', () => {
    const packageInfo = {
      policy_templates: [
        {
          inputs: [
            {
              vars: [
                {
                  name: 'secretVar',
                  secret: true,
                },
              ],
            },
          ],
        },
      ],
    } as any;

    expect(packageHasAtLeastOneSecret({ packageInfo })).toBe(true);
  });
});
