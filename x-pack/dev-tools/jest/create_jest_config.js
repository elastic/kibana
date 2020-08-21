/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function createJestConfig({ kibanaDirectory, rootDir, xPackKibanaDirectory }) {
  const fileMockPath = `${kibanaDirectory}/src/dev/jest/mocks/file_mock.js`;
  return {
    rootDir,
    roots: ['<rootDir>/plugins', '<rootDir>/legacy/plugins', '<rootDir>/legacy/server'],
    moduleFileExtensions: ['js', 'mjs', 'json', 'ts', 'tsx', 'node'],
    moduleNameMapper: {
      '@elastic/eui$': `${kibanaDirectory}/node_modules/@elastic/eui/test-env`,
      '@elastic/eui/lib/(.*)?': `${kibanaDirectory}/node_modules/@elastic/eui/test-env/$1`,
      '^ui/(.*)': `${kibanaDirectory}/src/legacy/ui/public/$1`,
      '^fixtures/(.*)': `${kibanaDirectory}/src/fixtures/$1`,
      'uiExports/(.*)': fileMockPath,
      '^src/core/(.*)': `${kibanaDirectory}/src/core/$1`,
      '^src/legacy/(.*)': `${kibanaDirectory}/src/legacy/$1`,
      '^src/plugins/(.*)': `${kibanaDirectory}/src/plugins/$1`,
      '^plugins/([^/.]*)(.*)': `${kibanaDirectory}/src/legacy/core_plugins/$1/public$2`,
      '^legacy/plugins/xpack_main/(.*);': `${xPackKibanaDirectory}/legacy/plugins/xpack_main/public/$1`,
      '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': fileMockPath,
      '\\.module.(css|scss)$': `${kibanaDirectory}/src/dev/jest/mocks/css_module_mock.js`,
      '\\.(css|less|scss)$': `${kibanaDirectory}/src/dev/jest/mocks/style_mock.js`,
      '\\.ace\\.worker.js$': `${kibanaDirectory}/src/dev/jest/mocks/worker_module_mock.js`,
      '\\.editor\\.worker.js$': `${kibanaDirectory}/src/dev/jest/mocks/worker_module_mock.js`,
      '^test_utils/enzyme_helpers': `${xPackKibanaDirectory}/test_utils/enzyme_helpers.tsx`,
      '^test_utils/find_test_subject': `${xPackKibanaDirectory}/test_utils/find_test_subject.ts`,
      '^test_utils/stub_web_worker': `${xPackKibanaDirectory}/test_utils/stub_web_worker.ts`,
      '^(!!)?file-loader!': fileMockPath,
    },
    collectCoverageFrom: [
      'legacy/plugins/**/*.{js,mjs,jsx,ts,tsx}',
      'legacy/server/**/*.{js,mjs,jsx,ts,tsx}',
      'plugins/**/*.{js,mjs,jsx,ts,tsx}',
      '!**/{__test__,__snapshots__,__examples__,integration_tests,tests}/**',
      '!**/*.test.{js,mjs,ts,tsx}',
      '!**/flot-charts/**',
      '!**/test/**',
      '!**/build/**',
      '!**/scripts/**',
      '!**/mocks/**',
      '!**/plugins/apm/e2e/**',
      '!**/plugins/siem/cypress/**',
      '!**/plugins/**/test_helpers/**',
    ],
    coveragePathIgnorePatterns: ['.*\\.d\\.ts'],
    coverageDirectory: `${kibanaDirectory}/target/kibana-coverage/jest`,
    coverageReporters: !!process.env.CODE_COVERAGE ? ['json'] : ['html'],
    setupFiles: [
      `${kibanaDirectory}/src/dev/jest/setup/babel_polyfill.js`,
      `${xPackKibanaDirectory}/dev-tools/jest/setup/polyfills.js`,
      `${xPackKibanaDirectory}/dev-tools/jest/setup/enzyme.js`,
    ],
    setupFilesAfterEnv: [
      `${xPackKibanaDirectory}/dev-tools/jest/setup/setup_test.js`,
      `${kibanaDirectory}/src/dev/jest/setup/mocks.js`,
      `${kibanaDirectory}/src/dev/jest/setup/react_testing_library.js`,
    ],
    testEnvironment: 'jest-environment-jsdom-thirteen',
    testMatch: ['**/*.test.{js,mjs,ts,tsx}'],
    testRunner: 'jest-circus/runner',
    transform: {
      '^.+\\.(js|tsx?)$': `${kibanaDirectory}/src/dev/jest/babel_transform.js`,
      '^.+\\.html?$': 'jest-raw-loader',
    },
    transformIgnorePatterns: [
      // ignore all node_modules except monaco-editor which requires babel transforms to handle dynamic import()
      // since ESM modules are not natively supported in Jest yet (https://github.com/facebook/jest/issues/4842)
      '[/\\\\]node_modules(?![\\/\\\\]monaco-editor)[/\\\\].+\\.js$',
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
