/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ACTIONS_FEATURE } from './feature';

describe('ACTIONS_FEATURE', () => {
  it('grants ai_index read on the connector KI type to both privileges', () => {
    expect(ACTIONS_FEATURE.privileges!.all.aiIndex).toEqual({ read: ['connector'] });
    expect(ACTIONS_FEATURE.privileges!.read.aiIndex).toEqual({ read: ['connector'] });
  });
});
