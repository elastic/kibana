import _ from 'lodash';
import npm from 'npm';
import npmLicense from 'license-checker';
import glob from 'glob';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

export default function licenses(grunt) {
  grunt.registerTask('_build:notice', 'Adds a notice', async function () {
    const overrides = grunt.config.get('licenses.options.overrides');
    const done = this.async();
    const buildPath = path.join(grunt.config.get('buildDir'), 'kibana');
    const noticePath = path.join(buildPath, 'NOTICE.txt');
    const fd = fs.openSync(noticePath, 'w');

    function getPackagePaths() {
      const packagePaths = {};
      const installedPackages = execSync(`npm ls --parseable --long`, {
        cwd: buildPath
      });
      installedPackages.toString().trim().split('\n').forEach(pkg => {
        const packageDetails = pkg.split(':');
        const [modulePath, packageName] = packageDetails;
        const licenses = glob.sync(path.join(modulePath, '*LICENSE*'));
        const notices = glob.sync(path.join(modulePath, '*NOTICE*'));
        packagePaths[packageName] = {
          relative: modulePath.replace(/.*\/kibana\//, ''),
          licenses,
          notices
        };
      });
      return packagePaths;
    }

    function combineFiles(filePaths) {
      let content = '';
      filePaths.forEach(filePath => {
        content += fs.readFileSync(filePath) + '\n';
      });
      return content;
    }

    fs.appendFileSync(fd,
    'Elasticsearch Kibana\nCopyright 2012-2017 Elasticsearch' +
    '\n\n---\n'
    );
    npmLicense.init({
      start: buildPath,
      production: true,
      json: true
    }, (result, error) => {
      if (error) return grunt.fail.fatal(error);
      const packagePaths = getPackagePaths();
      _.forOwn(result, (value, key) => {
        const licenses = [].concat(overrides.hasOwnProperty(key) ? overrides[key] : value.licenses);
        if (!licenses.length || licenses.includes('UNKNOWN')) return grunt.fail.fatal(`Unknown license for ${key}`);
        const packagePath = packagePaths[key];
        const readLicenseAndNotice = combineFiles([].concat(packagePath.licenses, packagePath.notices));
        const licenseOverview = licenses.length > 1 ? `the\n"${licenses.join('", ')} licenses` : `a\n"${licenses[0]}" license`;
        const licenseAndNotice = readLicenseAndNotice ? `\n${readLicenseAndNotice}` : `  For details, see ${packagePath.relative}/.`;
        const combinedText = `This product bundles ${key} which is available under ${licenseOverview}.${licenseAndNotice}\n---\n`;

        fs.appendFileSync(fd, combinedText);
      });
      fs.closeSync(fd);
      done();
    });
  });
}
