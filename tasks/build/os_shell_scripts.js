import { join, extname } from 'path';
import { promisify } from 'bluebird';
import { ncp } from 'ncp';
import rimraf from 'rimraf';
const pncp = promisify(ncp);
const primraf = promisify(rimraf);

export default function (grunt) {
  grunt.registerTask('_build:osShellScripts', async function osShellScripts() {
    const done = this.async();
    const source = 'build/kibana/bin';
    const platforms = grunt.config.get('platforms');
    const allPlatforms = fn => invokeAllAsync(platforms, fn);

    try {
      await allPlatforms(platform => primraf(join(platform.buildDir, 'bin')));
      await allPlatforms(platform => pncp(source, join(platform.buildDir, 'bin')));
      await allPlatforms(platform => removeExtraneousShellScripts(grunt, platform));
      done();
    } catch (err) {
      done(err);
    }
  });
}

function invokeAllAsync(all, fn) {
  return Promise.all(all.map(fn));
}

function removeExtraneousShellScripts(grunt, platform) {
  return Promise.all(grunt.file
    .expand(join(platform.buildDir, 'bin', '*'))
    .filter(file => isExtraneous(platform, file))
    .map(file => primraf(file)));
}

function isExtraneous(platform, file) {
  const ext = extname(file);
  if (platform.win && ext === '') { return true; }
  if (!platform.win && ext === '.bat') { return true; }
  return false;
}
