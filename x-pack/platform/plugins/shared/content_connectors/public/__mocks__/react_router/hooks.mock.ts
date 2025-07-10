/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockHistory, mockLocation } from './state.mock';

export const mockUseHistory = jest.fn(() => mockHistory);
export const mockUseLocation = jest.fn(() => mockLocation);
export const mockUseParams = jest.fn(() => ({}));
export const mockUseRouteMatch = jest.fn(() => true);

jest.mock('react-router-dom', () => {
  const originalModule = jest.requireActual('react-router-dom');
  return {
    ...originalModule,
    useHistory: mockUseHistory,
    useLocation: mockUseLocation,
    useParams: mockUseParams,
    useRouteMatch: mockUseRouteMatch,
    // Note: RR's generatePath() opinionatedly encodeURI()s paths (although this doesn't actually
    // show up/affect the final browser URL). Since we already have a generateEncodedPath helper &
    // RR is removing this behavior in history 5.0+, I'm mocking tests to remove the extra encoding
    // for now to make reading generateEncodedPath URLs a little less of a pain
    generatePath: jest.fn((path, params) => decodeURI(originalModule.generatePath(path, params))),
  };
});
