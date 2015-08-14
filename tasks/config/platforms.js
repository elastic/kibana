module.exports = function (grunt) {
  let version = grunt.config.get('pkg.version');
  let nodeVersion = grunt.config.get('nodeVersion');
  let baseUri = `https://iojs.org/dist/v${nodeVersion}`;

  return [
    'darwin-x64',
    'linux-x64',
    'linux-x86',
    'windows'
  ].map(function (name) {
    let win = name === 'windows';

    let nodeUrl = win ? `${baseUri}/win-x64/iojs.exe` : `${baseUri}/iojs-v${nodeVersion}-${name}.tar.gz`;
    let nodeDir = `.node_binaries/${nodeVersion}/${name}`;

    let buildName = `kibana-${version}-${name}`;
    let buildDir = `build/${buildName}`;
    let tarName = `${buildName}.tar.gz`;
    let tarPath = `target/${tarName}`;
    let zipName = `${buildName}.zip`;
    let zipPath = `target/${zipName}`;

    return { name, buildName, nodeUrl, tarName, tarPath, zipName, zipPath, buildDir, nodeDir };
  });
};
