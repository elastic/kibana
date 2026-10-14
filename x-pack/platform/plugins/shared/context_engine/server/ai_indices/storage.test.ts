/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildManagedAiIndexDocId } from './storage';

describe('buildManagedAiIndexDocId', () => {
  it('uses a colon so space and id cannot collide', () => {
    expect(buildManagedAiIndexDocId('team', 'ops_logs')).toBe('team:ops_logs');
    expect(buildManagedAiIndexDocId('team_ops', 'logs')).toBe('team_ops:logs');
    expect(buildManagedAiIndexDocId('team', 'ops_logs')).not.toBe(
      buildManagedAiIndexDocId('team_ops', 'logs')
    );
  });
});
