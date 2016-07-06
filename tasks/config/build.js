import { execSync as exec } from 'child_process';

export default (grunt) => {
  const pkgVersion = grunt.config.get('pkg.version');

  const sha = String(exec('git rev-parse HEAD')).trim();
  const number = parseFloat(String(exec('git log --format="%h" | wc -l')).trim());
  const version = buildVersion(grunt.option('release'), pkgVersion);

  return { sha, number, version };
};

function buildVersion(isRelease, version) {
  return isRelease ? version : `${version}-SNAPSHOT`;
}
