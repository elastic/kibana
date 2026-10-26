/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SubjectServices } from './subject_services';
import { canOpenSubjectFlyout, hasEpisodeFlyoutServices } from './subject_services';

const present = {} as never;

const episodeServices: SubjectServices = {
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

describe('hasEpisodeFlyoutServices', () => {
  it('is true only when every episode flyout service is started', () => {
    expect(hasEpisodeFlyoutServices(episodeServices)).toBe(true);
    expect(hasEpisodeFlyoutServices({ ...episodeServices, spaces: undefined })).toBe(false);
    expect(hasEpisodeFlyoutServices({ http: present })).toBe(false);
    expect(hasEpisodeFlyoutServices({})).toBe(false);
  });
});

describe('canOpenSubjectFlyout', () => {
  it('needs the full episode services for an alerting v2 alert', () => {
    expect(canOpenSubjectFlyout(episodeServices, 'v2')).toBe(true);
    expect(canOpenSubjectFlyout({ http: present }, 'v2')).toBe(false);
  });

  it('needs only http for a classic alert', () => {
    expect(canOpenSubjectFlyout({ http: present })).toBe(true);
    expect(canOpenSubjectFlyout({ http: present }, 'v1')).toBe(true);
    expect(canOpenSubjectFlyout({})).toBe(false);
  });
});
