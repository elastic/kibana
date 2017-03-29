import _ from 'lodash';
import npmLicense from 'license-checker';
import glob from 'glob';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

export default function licenses(grunt) {
  grunt.registerTask('_build:notice', 'Adds a notice', function () {
    const done = this.async();
    const buildPath = path.join(grunt.config.get('buildDir'), 'kibana');

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

    function getNodeInfo() {
      const nodeVersion = grunt.config.get('nodeVersion');
      const nodeDir = path.join(grunt.config.get('root'), '.node_binaries', nodeVersion);
      const licensePath = path.join(nodeDir, 'linux-x64', 'LICENSE');
      const license = fs.readFileSync(licensePath);
      return `This product bundles Node.js.\n\n${license}`;
    }

    function getPackageInfo(packages) {
      const packagePaths = getPackagePaths();
      const overrides = grunt.config.get('licenses.options.overrides');
      let content = '';
      _.forOwn(packages, (value, key) => {
        const licenses = [].concat(overrides.hasOwnProperty(key) ? overrides[key] : value.licenses);
        if (!licenses.length || licenses.includes('UNKNOWN')) return grunt.fail.fatal(`Unknown license for ${key}`);
        const packagePath = packagePaths[key];
        const readLicenseAndNotice = combineFiles([].concat(packagePath.licenses, packagePath.notices));
        const licenseOverview = licenses.length > 1 ? `the\n"${licenses.join('", ')} licenses` : `a\n"${licenses[0]}" license`;
        const licenseAndNotice = readLicenseAndNotice ? `\n${readLicenseAndNotice}` : `  For details, see ${packagePath.relative}/.`;
        const combinedText = `This product bundles ${key} which is available under ${licenseOverview}.${licenseAndNotice}\n---\n`;

        content += combinedText;
      });
      return content;
    }

    function getBaseNotice() {
      return fs.readFileSync(path.join(__dirname, 'notice', 'base_notice.txt'));
    }

    npmLicense.init({
      start: buildPath,
      production: true,
      json: true
    }, (result, error) => {
      if (error) return grunt.fail.fatal(error);
      const noticePath = path.join(buildPath, 'NOTICE.txt');
      const fd = fs.openSync(noticePath, 'w');
      fs.appendFileSync(fd, getBaseNotice());
      fs.appendFileSync(fd, getPackageInfo(result));
      fs.appendFileSync(fd, getNodeInfo());
      fs.closeSync(fd);
      done();
    });
  });
}
