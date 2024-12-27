/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getManifestDownloadLink } from './kubernetes_instructions';

describe('getManifestDownloadLink', () => {
  it('should return the correct link', () => {
    expect(getManifestDownloadLink('https://fleet.host', 'enrollmentToken')).toEqual(
      '/api/fleet/kubernetes/download?apiVersion=2023-10-31&fleetServer=https%3A%2F%2Ffleet.host&enrolToken=enrollmentToken'
    );
    expect(getManifestDownloadLink('https://fleet.host')).toEqual(
      '/api/fleet/kubernetes/download?apiVersion=2023-10-31&fleetServer=https%3A%2F%2Ffleet.host'
    );
    expect(getManifestDownloadLink(undefined, 'enrollmentToken')).toEqual(
      '/api/fleet/kubernetes/download?apiVersion=2023-10-31&enrolToken=enrollmentToken'
    );
  });
});
