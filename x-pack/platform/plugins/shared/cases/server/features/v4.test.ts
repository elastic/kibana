/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getV4 } from './v4';

const OWNERS = ['cases', 'observability', 'securitySolution'];

describe('casesV4 feature', () => {
  it('grants every operation for every owner', () => {
    const feature = getV4();

    expect(feature.id).toBe('casesV4');
    expect(feature.cases).toEqual(OWNERS);
    expect(feature.privileges?.all.cases).toEqual({
      create: OWNERS,
      read: OWNERS,
      update: OWNERS,
      push: OWNERS,
    });
    expect(feature.privileges?.read.cases).toEqual({ read: OWNERS });
  });

  it("grants every owner's file privileges", () => {
    const feature = getV4();

    for (const owner of OWNERS) {
      expect(feature.privileges?.all.api).toContain(`${owner}FilesCasesRead`);
      expect(feature.privileges?.read.api).toContain(`${owner}FilesCasesRead`);
    }
  });

  it('does not list the app, so legacy roles are not locked out of /app/cases', () => {
    expect(getV4().app).toEqual([]);
  });

  it('moves connectors into a sub-feature privilege included in read', () => {
    const feature = getV4();
    const connectors = feature.subFeatures
      ?.flatMap(({ privilegeGroups }) => privilegeGroups.flatMap(({ privileges }) => privileges))
      .find(({ id }) => id === 'cases_connectors');

    expect(feature.privileges?.all.ui).not.toContain('cases_connectors');
    expect(feature.privileges?.read.api).not.toContain('casesGetConnectorsConfigure');
    expect(connectors).toEqual(
      expect.objectContaining({
        includeIn: 'read',
        ui: ['cases_connectors'],
        api: ['casesGetConnectorsConfigure'],
      })
    );
  });

  it('disables the sub-feature privileges a tier does not include', () => {
    const connectors = getV4({ disabledSubFeaturePrivileges: ['cases_connectors'] })
      .subFeatures?.flatMap(({ privilegeGroups }) =>
        privilegeGroups.flatMap(({ privileges }) => privileges)
      )
      .find(({ id }) => id === 'cases_connectors');

    expect(connectors).toEqual(expect.objectContaining({ disabled: true, includeIn: 'none' }));
  });
});
