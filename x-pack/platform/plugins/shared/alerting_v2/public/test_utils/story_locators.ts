/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LocatorPublic } from '@kbn/share-plugin/public';
import type { SerializableRecord } from '@kbn/utility-types';
import type { AlertingV2Locators } from '../application/locator_context';

type StoryNavigateSync = (params: SerializableRecord) => void;

/** Locator stub for Storybook, where the share-plugin locator registry is not mounted. */
export const createStoryLocator = <P extends SerializableRecord>(
  id: string,
  navigateSync: LocatorPublic<P>['navigateSync'] = () => undefined
): LocatorPublic<P> => ({
  id,
  getLocation: async () => ({ app: 'alerting', path: '/', state: {} }),
  getUrl: async () => '#',
  getRedirectUrl: () => '#',
  navigate: async () => undefined,
  navigateSync,
  useUrl: () => '#',
  telemetry: (state, stats) => stats,
  inject: (state) => state,
  extract: (state) => ({ state, references: [] }),
  migrations: {},
});

export const createStoryLocators = (
  navigateSync: (name: string) => StoryNavigateSync = () => () => undefined
): AlertingV2Locators => ({
  rulesLocators: createStoryLocator('rules', navigateSync('rules.navigateSync')),
  ruleLibraryLocators: createStoryLocator('ruleLibrary', navigateSync('ruleLibrary.navigateSync')),
  episodesLocators: createStoryLocator('episodes', navigateSync('episodes.navigateSync')),
  actionPolicyLocators: createStoryLocator(
    'actionPolicies',
    navigateSync('actionPolicies.navigateSync')
  ),
  executionHistoryLocators: createStoryLocator(
    'executionHistory',
    navigateSync('executionHistory.navigateSync')
  ),
});
