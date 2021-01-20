/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export async function getKibanaVersion(getService: FtrProviderContext['getService']) {
  const kibanaServer = getService('kibanaServer');
  const kibanaVersion = await kibanaServer.version.get();
  expect(typeof kibanaVersion).to.eql('string');
  expect(kibanaVersion.length).to.be.greaterThan(0);
  return kibanaVersion;
}
