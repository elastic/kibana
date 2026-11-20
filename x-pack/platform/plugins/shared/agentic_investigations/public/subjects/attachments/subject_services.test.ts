/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  canOpenSubjectFlyout,
  hasEpisodeFlyoutServices,
  type SubjectServices,
} from './subject_services';

describe('canOpenSubjectFlyout', () => {
  const Registered = () => null;

  it('opens a registered flyout for its source, whatever services are available', () => {
    const getAlertFlyout = jest.fn((source?: string) =>
      source === 'elastic.example' ? Registered : undefined
    );

    expect(canOpenSubjectFlyout({ getAlertFlyout }, 'elastic.example')).toBe(true);
    expect(canOpenSubjectFlyout({ getAlertFlyout }, 'universal')).toBe(false);
  });

  it('asks the registration about the alert, and falls through to the default rules without a flyout', () => {
    const snapshot = { source: 'elastic.example' };
    const getAlertFlyout = jest.fn(() => undefined);

    // A v2 source without a flyout needs the episode flyout's services, which are missing here.
    expect(canOpenSubjectFlyout({ getAlertFlyout }, 'elastic.example', snapshot)).toBe(false);
    expect(getAlertFlyout).toHaveBeenCalledWith('elastic.example', snapshot);
  });

  it('keeps the default rules without a registration', () => {
    expect(canOpenSubjectFlyout({ http: {} as never })).toBe(true);
    expect(canOpenSubjectFlyout({})).toBe(false);
    expect(canOpenSubjectFlyout({ http: {} as never }, 'universal')).toBe(false);
  });
});

describe('hasEpisodeFlyoutServices', () => {
  const present = {} as never;
  const all: SubjectServices = {
    http: present,
    uiSettings: present,
    userProfile: present,
    notifications: present,
    charts: present,
    data: present,
    dataViews: present,
    expressions: present,
    spaces: present,
    unifiedDocViewer: present,
  };

  it('is true only when every service the episode flyout needs is started', () => {
    expect(hasEpisodeFlyoutServices(all)).toBe(true);
    for (const service of Object.keys(all) as Array<keyof SubjectServices>) {
      expect(hasEpisodeFlyoutServices({ ...all, [service]: undefined })).toBe(false);
    }
  });
});
