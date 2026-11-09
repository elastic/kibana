/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PageObjects, ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout';
import { createLazyPageObject, mergeTests, test as baseTest } from '@kbn/scout';
import type { SynthtraceFixture } from '@kbn/scout-synthtrace';
import { synthtraceFixture } from '@kbn/scout-synthtrace';
import { SignalInvestigationFlyoutPage } from './page_objects';

export interface SignalInvestigationUiTestFixtures extends ScoutTestFixtures {
  pageObjects: PageObjects & {
    signalInvestigationFlyout: SignalInvestigationFlyoutPage;
  };
}

const baseWithSynthtrace = mergeTests(baseTest, synthtraceFixture);

export const test = baseWithSynthtrace.extend<
  SignalInvestigationUiTestFixtures,
  ScoutWorkerFixtures & SynthtraceFixture
>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: SignalInvestigationUiTestFixtures['pageObjects'];
      page: SignalInvestigationUiTestFixtures['page'];
    },
    use: (pageObjects: SignalInvestigationUiTestFixtures['pageObjects']) => Promise<void>
  ) => {
    const extendedPageObjects = {
      ...pageObjects,
      signalInvestigationFlyout: createLazyPageObject(SignalInvestigationFlyoutPage, page),
    };

    await use(extendedPageObjects);
  },
});

export {
  OBSERVABILITY_ALERTS_INDEX,
  deleteObservabilityAlertDocument,
  indexObservabilityAlertDocument,
} from './constants';
