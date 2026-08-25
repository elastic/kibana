/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OWNERS } from '../constants';
import { getApiTags } from './api_tags';

describe('api_tags', () => {
  describe('getApiTags', () => {
    it.each(OWNERS)('constructs the https tags for the owner: %s', (owner) => {
      expect(getApiTags(owner)).toMatchSnapshot();
    });
  });
});
