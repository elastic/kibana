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
    'windows-x86'
  ].map(function (name) {
    let win = name === 'windows-x86';

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
    let debArch;
    let rpmArch;
    if (name.match('linux')) {
      debArch = name.match('x64') ? 'amd64' : 'i386';
      debName = `kibana-${version}-${debArch}.deb`;
      debPath = resolve(rootPath, `target/${debName}`);

      rpmArch = name.match('x64') ? 'x86_64' : 'i686';
      rpmName = `kibana-${version}-${rpmArch}.rpm`;
      rpmPath = resolve(rootPath, `target/${rpmName}`);
    }
    return {
      name, win,
      nodeUrl, nodeDir,
      buildName, buildDir,
      tarName, tarPath,
      zipName, zipPath,
      debName, debPath, debArch,
      rpmName, rpmPath, rpmArch
    };
  });
};
