import { execFileSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export default (grunt) => {
  grunt.registerTask('_rebuild:updateBuilds', function () {
    const buildDir = grunt.config.get('buildDir');

    const { newVersion, newBuildNum, newSha } = grunt.config.get('rebuild');

    grunt.file.expand({ cwd: buildDir }, '*').forEach(build => {
      const thisBuildDir = join(buildDir, build);
      const thisBundlesDir = join(thisBuildDir, 'optimize', 'bundles');

      const readmePath = join(thisBuildDir, 'README.txt');
      const pkgjsonPath = join(thisBuildDir, 'package.json');
      const bundlePaths = [
        ...grunt.file.expand({ cwd: thisBundlesDir }, '*.bundle.js'),
        ...grunt.file.expand({ cwd: thisBundlesDir }, '*.entry.js')
      ];

      const { oldBuildNum, oldSha, oldVersion } = readBuildInfo(pkgjsonPath);

      replaceIn(readmePath, oldVersion, newVersion);
      replaceIn(pkgjsonPath, oldVersion, newVersion);
      replaceIn(pkgjsonPath, `"number": ${oldBuildNum},`, `"number": ${newBuildNum},`);
      replaceIn(pkgjsonPath, oldSha, newSha);
      bundlePaths
        .map(bundle => join(thisBundlesDir, bundle))
        .forEach(file => {
          replaceIn(file, `"kbnVersion":"${oldVersion}"`, `"kbnVersion":"${newVersion}"`);
          replaceIn(file, `"buildNum":${oldBuildNum}`, `"buildNum":${newBuildNum}`);
        });

      const newBuild = build.replace(oldVersion, newVersion);
      if (build !== newBuild) {
        execFileSync('mv', [ build, newBuild ], { cwd: buildDir });
      }
    });
  });
};

function readBuildInfo(path) {
  const pkgjson = readFileSync(path).toString();
  const pkg = JSON.parse(pkgjson);
  return {
    oldBuildNum: pkg.build.number,
    oldSha: pkg.build.sha,
    oldVersion: pkg.version
  };
}

function replaceIn(path, oldValue, newValue) {
  let contents = readFileSync(path).toString();
  contents = contents.replace(oldValue, newValue);
  writeFileSync(path, contents);
}
