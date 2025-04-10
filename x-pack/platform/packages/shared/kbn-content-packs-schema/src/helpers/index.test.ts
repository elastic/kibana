/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { replaceESQLIndexPattern } from '.';

describe('content packs schema helpers', () => {
  describe('replaceESQLIndexPattern', () => {
    it('replaces index pattern', () => {
      const query = replaceESQLIndexPattern('FROM one, two | STATS COUNT(*) BY host.name', {
        two: 'updated',
      });
      expect(query).toEqual('FROM one, updated | STATS COUNT(*) BY host.name');
    });

    it('is a noop if no matching replacements', () => {
      const query = replaceESQLIndexPattern('FROM one, two | STATS COUNT(*) BY host.name', {
        three: 'updated',
      });
      expect(query).toEqual('FROM one, two | STATS COUNT(*) BY host.name');
    });
  });
});
