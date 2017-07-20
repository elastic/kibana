import { resolve } from 'path';

import {
  getInstalledPackages,
  generateNoticeText,
} from '../lib';

async function generate(grunt, directory) {
  return await generateNoticeText({
    packages: await getInstalledPackages({
      directory,
      licenseOverrides: grunt.config.get('licenses.options.overrides')
    }),
    nodeDir: grunt.config.get('platforms')[0].nodeDir
  });
}

export default function (grunt) {
  grunt.registerTask('_build:notice', 'Adds a notice', function () {
    const done = this.async();
    const kibanaDir = resolve(grunt.config.get('buildDir'), 'kibana');
    const noticePath = resolve(kibanaDir, 'NOTICE.txt');

    generate(grunt, kibanaDir).then(
      (noticeText) => {
        grunt.file.write(noticePath, noticeText);
        done();
      },
      (error) => {
        grunt.fail.fatal(error);
        done(error);
      }
    );
  });
}
