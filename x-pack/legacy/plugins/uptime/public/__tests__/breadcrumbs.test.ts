/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOverviewPageBreadcrumbs, getMonitorPageBreadcrumb } from '../breadcrumbs';

describe('getOverviewPageBreadcrumbs', () => {
  it('creates the expected breadcrumb with no search or basepath', () => {
    expect(getOverviewPageBreadcrumbs()).toMatchSnapshot();
  });

  it('creates the expected breadcrumb when there is a basepath but no search', () => {
    expect(getOverviewPageBreadcrumbs(undefined, 'xyz')).toMatchSnapshot();
  });

  it('creates the expected breadcrumb with no basepath but has a search', () => {
    expect(
      getOverviewPageBreadcrumbs('?dateRangeStart=now-15m&dateRangeEnd=now')
    ).toMatchSnapshot();
  });

  it('creates the expected breadcrumb with a basepath and a search', () => {
    expect(
      getOverviewPageBreadcrumbs('?dateRangeStart=now-15m&dateRangeEnd=now', 'xyz')
    ).toMatchSnapshot();
  });
});

describe('getMonitorPageBreadcrumb', () => {
  it('creates a monitor page breadcrumb with no search or basepath', () => {
    expect(getMonitorPageBreadcrumb('monitor-id-1234')).toMatchSnapshot();
  });

  it('creates a monitor page breadcrumb with a search but no basepath', () => {
    expect(
      getMonitorPageBreadcrumb('monitor-id-1234', '?dateRangeEnd=now&dateRangeStart=now-15m')
    ).toMatchSnapshot();
  });

  it('creates a monitor page breadcrumb with a basepath but no search', () => {
    expect(getMonitorPageBreadcrumb('monitor-id-1234', undefined, 'xyz')).toMatchSnapshot();
  });

  it('creates a monitor page breadcrumb with a basepath a search', () => {
    expect(
      getMonitorPageBreadcrumb('monitor-id-1234', '?dateRangeStart=now-15m&dateRangeEnd=now', 'xyz')
    ).toMatchSnapshot();
  });
});
