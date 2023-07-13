/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockGetAppUrl, mockNavigateTo } from '../../mocks/navigation';

export const useGetAppUrl = () => {
  return { getAppUrl: mockGetAppUrl };
};

export const useNavigateTo = () => {
  return { navigateTo: mockNavigateTo };
};

export const useNavigation = () => {
  return { navigateTo: mockGetAppUrl, getAppUrl: mockNavigateTo };
};
