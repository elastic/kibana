/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { getInstalledPackages } from '../src/dev/npm';
import { engines } from '../package';
import { LICENSE_OVERRIDES } from '../src/dev/license_checker';

import { isNull, isUndefined } from 'lodash';

const allDoubleQuoteRE = /"/g;

function escapeValue(value) {
  if (isNull(value)) {
    return;
  }

  return `"${value.replace(allDoubleQuoteRE, '""')}"`;
}

function formatCsvValues(fields, values) {
  return fields
    .map((field) => {
      const value = values[field];

      if (isNull(value) || isUndefined(value)) {
        return null;
      }

      return value.toString();
    })
    .map(escapeValue)
    .join(',');
}

export default function licensesCSVReport(grunt) {
  grunt.registerTask('licenses:csv_report', 'Report of 3rd party dependencies', async function () {
    const fields = ['name', 'version', 'url', 'license', 'sourceURL'];
    const done = this.async();

    try {
      const file = grunt.option('csv');
      const directory = grunt.option('directory');
      const dev = Boolean(grunt.option('dev'));

      const packages = await getInstalledPackages({
        directory: directory ? resolve(directory) : grunt.config.get('root'),
        licenseOverrides: LICENSE_OVERRIDES,
        dev,
      });

      packages.unshift(
        {
          name: 'Node.js',
          version: engines.node,
          repository: 'https://nodejs.org',
          licenses: ['MIT'],
        },
        {
          name: 'Red Hat Universal Base Image minimal',
          version: '8',
          repository:
            'https://catalog.redhat.com/software/containers/ubi8/ubi-minimal/5c359a62bed8bd75a2c3fba8',
          licenses: [
            'Custom;https://www.redhat.com/licenses/EULA_Red_Hat_Universal_Base_Image_English_20190422.pdf',
          ],
          sourceURL: 'https://oss-dependencies.elastic.co/redhat/ubi/ubi-minimal-8-source.tar.gz',
        }
      );

      const csv = packages
        .map((pkg) => {
          const data = {
            name: pkg.name,
            version: pkg.version,
            url: pkg.repository || `https://www.npmjs.com/package/${pkg.name}`,
            license: pkg.licenses.join(','),
            sourceURL: pkg.sourceURL,
          };

          return formatCsvValues(fields, data);
        })
        .join('\n');

      if (file) {
        writeFileSync(file, `${fields.join(',')}\n${csv}`);
        grunt.log.writeln(`wrote to ${file}`);
      } else {
        grunt.log.writeln(csv);
        grunt.log.writeln('\nspecify "--csv [filepath]" to write the data to a specific file');
      }

      done();
    } catch (err) {
      grunt.fail.fatal(err);
      done(err);
    }
  });
}
