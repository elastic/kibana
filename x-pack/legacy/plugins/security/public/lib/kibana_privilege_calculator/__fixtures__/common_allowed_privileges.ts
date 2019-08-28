/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const unrestrictedBasePrivileges = {
  base: {
    privileges: ['all', 'read'],
    canUnassign: true,
  },
};
export const unrestrictedFeaturePrivileges = {
  feature: {
    feature1: {
      privileges: ['all', 'read'],
      canUnassign: true,
    },
    feature2: {
      privileges: ['all', 'read'],
      canUnassign: true,
    },
    feature3: {
      privileges: ['all'],
      canUnassign: true,
    },
    feature4: {
      privileges: ['all', 'read'],
      canUnassign: true,
    },
  },
};

export const fullyRestrictedBasePrivileges = {
  base: {
    privileges: ['all'],
    canUnassign: false,
  },
};

export const fullyRestrictedFeaturePrivileges = {
  feature: {
    feature1: {
      privileges: ['all'],
      canUnassign: false,
    },
    feature2: {
      privileges: ['all'],
      canUnassign: false,
    },
    feature3: {
      privileges: ['all'],
      canUnassign: false,
    },
    feature4: {
      privileges: ['all', 'read'],
      canUnassign: false,
    },
  },
};
