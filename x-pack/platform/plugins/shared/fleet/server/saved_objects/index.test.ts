/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';

import { getSavedObjectTypes } from '.';

describe('space aware models', () => {
  it('should have the same mappings for space and non-space aware agent policies', () => {
    const soTypes = getSavedObjectTypes();

    const legacyMappings = _.omit(
      soTypes['ingest-agent-policies'].mappings,
      'properties.monitoring_diagnostics',
      'properties.monitoring_http',
      'properties.monitoring_pprof_enabled'
    );

    expect(legacyMappings).toEqual(soTypes['fleet-agent-policies'].mappings);
  });
  it('should have the same mappings for space and non-space aware package policies', () => {
    const soTypes = getSavedObjectTypes();

    expect(soTypes['ingest-package-policies'].mappings).toEqual(
      soTypes['fleet-package-policies'].mappings
    );
  });
});
