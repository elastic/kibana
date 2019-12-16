/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
const path = require('path');
process.env.NODE_PATH = path.resolve(__dirname, '..', '..', '..', 'node_modules');

module.exports = function(wallaby) {
  return {
    debug: true,
    files: [
      './tsconfig.json',
      //'plugins/beats/public/**/*.+(js|jsx|ts|tsx|json|snap|css|less|sass|scss|jpg|jpeg|gif|png|svg)',
      'server/**/*.+(js|jsx|ts|tsx|json|snap|css|less|sass|scss|jpg|jpeg|gif|png|svg)',
      'common/**/*.+(js|jsx|ts|tsx|json|snap|css|less|sass|scss|jpg|jpeg|gif|png|svg)',
      'public/**/*.+(js|jsx|ts|tsx|json|snap|css|less|sass|scss|jpg|jpeg|gif|png|svg)',
      '!**/*.test.ts',
    ],

    tests: ['**/*.test.ts', '**/*.test.tsx'],
    env: {
      type: 'node',
      runner: 'node',
    },
    testFramework: {
      type: 'jest',
      //path: jestPath,
    },
    compilers: {
      '**/*.ts?(x)': wallaby.compilers.typeScript({
        typescript: require('typescript'), // eslint-disable-line
      }),
      '**/*.js': wallaby.compilers.babel({
        babelrc: false,
        presets: [require.resolve('@kbn/babel-preset/node_preset')],
      }),
    },

    setup: wallaby => {
      const path = require('path');

      const kibanaDirectory = path.resolve(wallaby.localProjectDir, '..', '..', '..');
      wallaby.testFramework.configure({
        rootDir: wallaby.localProjectDir,
        moduleNameMapper: {
          '^ui/(.*)': `${kibanaDirectory}/src/legacy/ui/public/$1`,
          '^src/(.*)': `${kibanaDirectory}/src/$1`,
          '^x-pack/(.*)': `${kibanaDirectory}/x-pack/$1'`,
          // eslint-disable-next-line
          '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': `${kibanaDirectory}/src/dev/jest/mocks/file_mock.js`,
          '\\.(css|less|scss)$': `${kibanaDirectory}/src/dev/jest/mocks/style_mock.js`,
        },
        testURL: 'http://localhost',
        setupFiles: [`${kibanaDirectory}/x-pack/dev-tools/jest/setup/enzyme.js`],
        snapshotSerializers: [`${kibanaDirectory}/node_modules/enzyme-to-json/serializer`],
        transform: {
          '^.+\\.js$': `${kibanaDirectory}/src/dev/jest/babel_transform.js`,
          //"^.+\\.tsx?$": `${kibanaDirectory}/src/dev/jest/ts_transform.js`,
        },
      });
    },
  };
};
