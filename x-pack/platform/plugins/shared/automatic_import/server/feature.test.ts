/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AUTOMATIC_IMPORT_API_PRIVILEGES, AUTOMATIC_IMPORT_FEATURE } from './feature';

describe('Automatic Import Kibana feature', () => {
  it('follows the base Kibana privileges so base "all" / "read" grant the matching feature privilege', () => {
    expect(AUTOMATIC_IMPORT_FEATURE.excludeFromBasePrivileges).not.toBe(true);
  });

  it('grants the manage API tag and every UI capability only to "all"', () => {
    const { all, read } = AUTOMATIC_IMPORT_FEATURE.privileges!;

    expect(all.api).toEqual(
      expect.arrayContaining([
        AUTOMATIC_IMPORT_API_PRIVILEGES.READ,
        AUTOMATIC_IMPORT_API_PRIVILEGES.MANAGE,
      ])
    );
    expect(all.ui).toEqual(expect.arrayContaining(['view', 'create', 'edit', 'delete', 'approve']));

    expect(read.api).toEqual([AUTOMATIC_IMPORT_API_PRIVILEGES.READ]);
    expect(read.ui).toEqual(['view']);
  });
});
