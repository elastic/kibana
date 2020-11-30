/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function createJestConfig({ kibanaDirectory, rootDir }) {
  return {
    preset: '@kbn/test',
    rootDir: kibanaDirectory,
    roots: [`${rootDir}/plugins`],
    reporters: [
      'default',
      [
        `${kibanaDirectory}/packages/kbn-test/target/jest/junit_reporter`,
        {
          reportName: 'X-Pack Jest Tests',
        },
      ],
    ],
  };
}
