/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { pluginDefinition } from '../plugin_definition';

describe ('pluginDefinition', () => {
  it('defines the configPrefix correctly', () => {
    expect(pluginDefinition.configPrefix).to.be('xpack.watcher');
  });
});
