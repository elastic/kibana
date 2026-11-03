/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaServices } from './lib/kibana';
import { getCaseAppTarget, isTopLevelAppEnabled } from './top_level_app';

jest.mock('./lib/kibana');

const getConfigMock = KibanaServices.getConfig as jest.Mock;

describe('top-level Cases app helpers', () => {
  it('reads the flag from the browser config', () => {
    getConfigMock.mockReturnValue({ topLevelApp: { enabled: true } });
    expect(isTopLevelAppEnabled()).toBe(true);

    getConfigMock.mockReturnValue({});
    expect(isTopLevelAppEnabled()).toBe(false);
  });

  it('targets the cases app for every owner when the flag is on', () => {
    getConfigMock.mockReturnValue({ topLevelApp: { enabled: true } });

    expect(getCaseAppTarget('securitySolution', 'discover')).toEqual({
      appId: 'cases',
      deepLinkId: undefined,
    });
  });

  it("targets the owner's app when the flag is off", () => {
    getConfigMock.mockReturnValue({ topLevelApp: { enabled: false } });

    expect(getCaseAppTarget('securitySolution', 'discover')).toEqual({
      appId: 'securitySolutionUI',
      deepLinkId: 'cases',
    });
    expect(getCaseAppTarget('unknown', 'discover')).toEqual({
      appId: 'discover',
      deepLinkId: 'cases',
    });
  });
});
