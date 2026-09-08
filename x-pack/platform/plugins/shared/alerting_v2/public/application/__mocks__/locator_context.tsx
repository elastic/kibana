/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

const createMockLocator = () => ({
  useUrl: jest.fn().mockReturnValue('/mock-locator-url'),
  getUrl: jest.fn().mockResolvedValue('/mock-locator-url'),
  getRedirectUrl: jest.fn().mockReturnValue('/mock-locator-url'),
  navigate: jest.fn().mockResolvedValue(undefined),
  navigateSync: jest.fn(),
  getLocation: jest.fn().mockResolvedValue({ app: 'management', path: '/', state: {} }),
  getTimeRange: jest.fn(),
  setTimeRange: jest.fn().mockImplementation((p: unknown) => p),
});

const mockLocators = {
  rulesLocators: createMockLocator(),
  ruleLibraryLocators: createMockLocator(),
  episodesLocators: createMockLocator(),
  actionPolicyLocators: createMockLocator(),
  executionHistoryLocators: createMockLocator(),
};

export const LocatorProvider = ({ children }: { locators: unknown; children: React.ReactNode }) => (
  <>{children}</>
);

export const useAlertingLocators = () => mockLocators;
