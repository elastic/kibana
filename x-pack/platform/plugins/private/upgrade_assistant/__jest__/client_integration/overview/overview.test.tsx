/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setupEnvironment } from '../helpers';
import { OverviewTestBed, setupOverviewPage } from './overview.helpers';

describe('Overview Page', () => {
  let testBed: OverviewTestBed;
  const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();

  beforeEach(async () => {
    testBed = await setupOverviewPage(httpSetup);
    testBed.component.update();
  });

  describe('Documentation links', () => {
    test('Has a whatsNew link and it references target version', () => {
      const { exists, find } = testBed;

      expect(exists('whatsNewLink')).toBe(true);
      expect(find('whatsNewLink').text()).toContain('latest release');
    });

    test('Has a link for upgrade assistant in page header', () => {
      const { exists } = testBed;

      expect(exists('documentationLink')).toBe(true);
    });
  });

  describe('Machine Learning callout', () => {
    test('Shows ML disabled callout when ML is disabled', async () => {
      httpRequestsMockHelpers.setLoadMlEnabledResponse({ mlEnabled: false });

      testBed = await setupOverviewPage(httpSetup);
      testBed.component.update();

      const { exists, find } = testBed;

      expect(exists('mlDisabledCallout')).toBe(true);
      expect(find('mlDisabledCallout').text()).toContain('Machine Learning is disabled');
    });

    test('Does not show ML disabled callout when ML is enabled', async () => {
      httpRequestsMockHelpers.setLoadMlEnabledResponse({ mlEnabled: true });

      testBed = await setupOverviewPage(httpSetup);
      testBed.component.update();

      const { exists } = testBed;

      expect(exists('mlDisabledCallout')).toBe(false);
    });
  });
});
