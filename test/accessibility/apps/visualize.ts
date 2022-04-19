/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'visualize', 'header']);
  const a11y = getService('a11y');

  describe('Visualize', () => {
    it('visualize', async () => {
      await a11y.testAppSnapshot();
    });

    it('click on create visualize wizard', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await a11y.testAppSnapshot();
    });

    it('create visualize button', async () => {
      await PageObjects.visualize.clickNewVisualization();
      await a11y.testAppSnapshot();
    });
  });
}
