/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function createJestConfig({ kibanaDirectory, xPackKibanaDirectory }) {
  const fileMockPath = `${kibanaDirectory}/src/dev/jest/mocks/file_mock.js`;
  return {
    rootDir: xPackKibanaDirectory,
    roots: [
      '<rootDir>/plugins',
      '<rootDir>/legacy/plugins',
      '<rootDir>/legacy/server',
      '<rootDir>/test_utils/jest/contract_tests',
    ],
    moduleFileExtensions: ['js', 'json', 'ts', 'tsx'],
    moduleNameMapper: {
      '^ui/(.*)': `${kibanaDirectory}/src/legacy/ui/public/$1`,
      'uiExports/(.*)': fileMockPath,
      '^src/core/(.*)': `${kibanaDirectory}/src/core/$1`,
      '^src/legacy/(.*)': `${kibanaDirectory}/src/legacy/$1`,
      '^plugins/watcher/np_ready/application/models/(.*)': `${xPackKibanaDirectory}/legacy/plugins/watcher/public/np_ready/application/models/$1`,
      '^plugins/([^/.]*)(.*)': `${kibanaDirectory}/src/legacy/core_plugins/$1/public$2`,
      '^legacy/plugins/xpack_main/(.*);': `${xPackKibanaDirectory}/legacy/plugins/xpack_main/public/$1`,
      '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': fileMockPath,
      '\\.module.(css|scss)$': `${kibanaDirectory}/src/dev/jest/mocks/css_module_mock.js`,
      '\\.(css|less|scss)$': `${kibanaDirectory}/src/dev/jest/mocks/style_mock.js`,
      '^test_utils/enzyme_helpers': `${xPackKibanaDirectory}/test_utils/enzyme_helpers.tsx`,
      '^test_utils/find_test_subject': `${xPackKibanaDirectory}/test_utils/find_test_subject.ts`,
      '^test_utils/stub_web_worker': `${xPackKibanaDirectory}/test_utils/stub_web_worker.ts`,
    },
    coverageDirectory: '<rootDir>/../target/kibana-coverage/jest',
    coverageReporters: ['html'],
    setupFiles: [
      `${kibanaDirectory}/src/dev/jest/setup/babel_polyfill.js`,
      `<rootDir>/dev-tools/jest/setup/polyfills.js`,
      `<rootDir>/dev-tools/jest/setup/enzyme.js`,
    ],
    setupFilesAfterEnv: [
      `<rootDir>/dev-tools/jest/setup/setup_test.js`,
      `${kibanaDirectory}/src/dev/jest/setup/mocks.js`,
    ],
    testMatch: ['**/*.test.{js,ts,tsx}'],
    transform: {
      '^.+\\.(js|tsx?)$': `${kibanaDirectory}/src/dev/jest/babel_transform.js`,
      '^.+\\.html?$': 'jest-raw-loader',
    },
    transformIgnorePatterns: [
      // ignore all node_modules except @elastic/eui and monaco-editor which both require babel transforms to handle dynamic import()
      // since ESM modules are not natively supported in Jest yet (https://github.com/facebook/jest/issues/4842)
      '[/\\\\]node_modules(?![\\/\\\\]@elastic[\\/\\\\]eui)(?![\\/\\\\]monaco-editor)[/\\\\].+\\.js$',
    ],
    snapshotSerializers: [
      `${kibanaDirectory}/node_modules/enzyme-to-json/serializer`,
      `${kibanaDirectory}/src/plugins/kibana_react/public/util/test_helpers/react_mount_serializer.ts`,
    ],
    reporters: [
      'default',
      [
        `${kibanaDirectory}/src/dev/jest/junit_reporter.js`,
        {
          reportName: 'X-Pack Jest Tests',
        },
      ],
    ],
  };
}
