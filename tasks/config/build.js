import { execSync as exec } from 'child_process';
const platform = require('os').platform();

export default (grunt) => {
  const pkgVersion = grunt.config.get('pkg.version');

  const sha = String(exec('git rev-parse HEAD')).trim();
  const version = buildVersion(grunt.option('release'), pkgVersion);
  let number;

  if (/^win/.test(platform)) {
    // Windows does not have the wc process and `find /C /V ""` does not consistently work
    number = String(exec('git log --format="%h"')).split('\n').length;
  } else {
    number = parseFloat(String(exec('git log --format="%h" | wc -l')).trim());
  }

  return { sha, number, version };
};

function buildVersion(isRelease, version) {
  return isRelease ? version : `${version}-SNAPSHOT`;
}
