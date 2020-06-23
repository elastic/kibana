/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { getInstalledPackages } from '../src/dev/npm';
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
    const fields = ['name', 'version', 'url', 'license'];
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

      const csv = packages
        .map((pkg) => {
          const data = {
            name: pkg.name,
            version: pkg.version,
            url: pkg.repository || `https://www.npmjs.com/package/${pkg.name}`,
            license: pkg.licenses.join(','),
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
