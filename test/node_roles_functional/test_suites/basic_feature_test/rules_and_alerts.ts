/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginFunctionalProviderContext } from '../../services';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

import expect from '@kbn/expect';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  // const supertest = getService('supertest');

  describe('rules and alerts', () => {
    it('does stuff?', async () => {
      expect(true).to.be(true);
    });
  });
}
