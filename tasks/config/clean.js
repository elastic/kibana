module.exports = function () {
  // https://github.com/yarnpkg/yarn/blob/b97c797983babd03c68bc36f1ee98a9a6dff9246/src/cli/commands/autoclean.js
  const moduleGlobs = [
    // https://github.com/gruntjs/grunt-contrib-clean/issues/65
    // 'docs',
    // 'images',
    // '!mathjs/lib/expression/**',
    // '!leaflet-draw/dist/images/**',

    '__tests__',
    'test',
    'tests',
    'powered-test',
    'doc',
    'website',
    'assets',
    'example',
    'examples',
    'coverage',
    '.nyc_output',
    'Makefile',
    'Gulpfile.js',
    'Gruntfile.js',
    'appveyor.yml',
    'circle.yml',
    'codeship-services.yml',
    'codeship-steps.yml',
    'wercker.yml',
    '.tern-project',
    '.gitattributes',
    '.editorconfig',
    '.*ignore',
    '.eslintrc',
    '.jshintrc',
    '.flowconfig',
    '.documentup.json',
    '.yarn-metadata.json',
    '.travis.yml',
    '*.txt',
    '*.md',
  ].map(p => `build/kibana/node_modules/**/${p}`);


  const srcGlobs = [
    'build/kibana/src/core_plugins/testbed'
  ];

  const preBuild = [].concat(
    moduleGlobs,
    srcGlobs
  );

  return {
    build: 'build',
    target: 'target',
    preBuild,
    postBuild: 'build/kibana/optimize/.cache'
  };
};
