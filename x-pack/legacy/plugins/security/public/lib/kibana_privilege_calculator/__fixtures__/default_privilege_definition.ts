/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { KibanaPrivileges } from '../../../../common/model';

export const defaultPrivilegeDefinition = new KibanaPrivileges({
  global: {
    all: ['api:/*', 'ui:/*'],
    read: ['ui:/feature1/foo', 'ui:/feature2/foo', 'ui:/feature3/foo/*'],
  },
  space: {
    all: [
      'api:/feature1/*',
      'ui:/feature1/*',
      'api:/feature2/*',
      'ui:/feature2/*',
      'ui:/feature3/foo',
      'ui:/feature3/foo/*',
    ],
    read: ['ui:/feature1/foo', 'ui:/feature2/foo', 'ui:/feature3/foo/bar'],
  },
  features: {
    feature1: {
      all: ['ui:/feature1/foo', 'ui:/feature1/bar'],
      read: ['ui:/feature1/foo'],
    },
    feature2: {
      all: ['ui:/feature2/foo', 'api:/feature2/bar'],
      read: ['ui:/feature2/foo'],
    },
    feature3: {
      all: ['ui:/feature3/foo', 'ui:/feature3/foo/*'],
    },
  },
  reserved: {},
});
