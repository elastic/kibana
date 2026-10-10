/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { borealisDark, borealisLight } from './borealis_tokens.generated';
import { computeBorealisTokens } from '../scripts/compute_borealis_tokens';

describe('borealis_tokens.generated', () => {
  // Fails when an EUI upgrade changes Borealis. Regenerate with:
  // node x-pack/platform/packages/shared/isomer/isomer-theme/scripts/generate_borealis_tokens
  it('matches the installed EUI Borealis theme', () => {
    expect({ light: borealisLight, dark: borealisDark }).toEqual(computeBorealisTokens());
  });
});
