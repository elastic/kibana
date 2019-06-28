/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESFilter } from 'elasticsearch';
import { getEnvironmentUiFilterES } from '../get_environment_ui_filter_es';
import { ENVIRONMENT_NOT_DEFINED } from '../../../../common/environment_filter_values';
import { SERVICE_ENVIRONMENT } from '../../../../common/elasticsearch_fieldnames';

describe('getEnvironmentUiFilterES', () => {
  it('should return undefined, when environment is undefined', () => {
    const uiFilterES = getEnvironmentUiFilterES();
    expect(uiFilterES).toBeUndefined();
  });

  it('should create a filter for a service environment', () => {
    const uiFilterES = getEnvironmentUiFilterES('test') as ESFilter;
    expect(uiFilterES).toHaveProperty(['term', SERVICE_ENVIRONMENT], 'test');
  });

  it('should create a filter for missing service environments', () => {
    const uiFilterES = getEnvironmentUiFilterES(
      ENVIRONMENT_NOT_DEFINED
    ) as ESFilter;
    expect(uiFilterES).toHaveProperty(
      ['bool', 'must_not', 'exists', 'field'],
      SERVICE_ENVIRONMENT
    );
  });
});
