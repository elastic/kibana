module.exports = function (grunt) {
  let { resolve } = require('path');

  let { version } = grunt.config.get('build');
  let nodeVersion = grunt.config.get('nodeVersion');
  let rootPath = grunt.config.get('root');
  let baseUri = `https://nodejs.org/dist/v${nodeVersion}`;

  return [
    'darwin-x64',
    'linux-x64',
    'linux-x86',
    'windows'
  ].map(function (name) {
    let win = name === 'windows';

    let nodeUrl = win ? `${baseUri}/win-x86/node.exe` : `${baseUri}/node-v${nodeVersion}-${name}.tar.gz`;
    let nodeDir = resolve(rootPath, `.node_binaries/${nodeVersion}/${name}`);

    let buildName = `kibana-${version}-${name}`;
    let buildDir = resolve(rootPath, `build/${buildName}`);

    let tarName = `${buildName}.tar.gz`;
    let tarPath = resolve(rootPath, `target/${tarName}`);

    let zipName = `${buildName}.zip`;
    let zipPath = resolve(rootPath, `target/${zipName}`);

    let debName;
    let debPath;
    let rpmName;
    let rpmPath;
    if (name.match('linux')) {
      let debArch = name.match('x64') ? 'amd64' : 'i386';
      debName = `kibana_${version}_${debArch}.deb`;
      debPath = resolve(rootPath, `target/${debName}`);

      let rpmArch = name.match('x64') ? 'x86_64' : 'i386';
      rpmName = `kibana-${version.replace('-', '_')}-1.${rpmArch}.rpm`;
      rpmPath = resolve(rootPath, `target/${rpmName}`);
    }
    return {
      name, win,
      nodeUrl, nodeDir,
      buildName, buildDir,
      tarName, tarPath,
      zipName, zipPath,
      debName, debPath,
      rpmName, rpmPath
    };
  });
};
