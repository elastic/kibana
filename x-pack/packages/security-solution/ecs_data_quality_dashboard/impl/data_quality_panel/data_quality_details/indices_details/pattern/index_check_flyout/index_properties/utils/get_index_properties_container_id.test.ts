/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getIndexPropertiesContainerId } from './get_index_properties_container_id';

describe('getIndexPropertiesContainerId', () => {
  const pattern = 'auditbeat-*';
  const indexName = '.ds-packetbeat-8.6.1-2023.02.04-000001';

  test('it returns the expected id', () => {
    expect(getIndexPropertiesContainerId({ indexName, pattern })).toEqual(
      'index-properties-container-auditbeat-*.ds-packetbeat-8.6.1-2023.02.04-000001'
    );
  });
});
