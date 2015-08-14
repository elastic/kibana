module.exports = function (grunt) {
  let version = grunt.config.get('pkg.version');
  let nodeVersion = grunt.config.get('nodeVersion');

  return [
    'darwin-x64',
    'linux-x64',
    'linux-x86',
    'windows'
  ].map(function (name) {
    var filename = `kibana-${version}-${name}`;

    return {
      name,
      filename,
      tarPath: `target/${filename}.tar.gz`,
      zipPath: `target/${filename}.zip`,
      buildDir: `build/${filename}`,
      nodeDir: `.node_binaries/${nodeVersion}/${name}`,
    };
  });
};
