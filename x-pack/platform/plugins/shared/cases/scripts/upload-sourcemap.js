/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const fs = require('fs');
const path = require('path');
const request = require('request');

const uploadSourceMap = () => {
  const optimizerOutputDir = path.resolve(
    __dirname,
    '../../../../../../target/public/x-pack/platform/plugins/shared/cases'
  );
  const sourceMapFile = fs.readdirSync(optimizerOutputDir).find((file) => file.endsWith('.map'));
  const filepath = path.join(optimizerOutputDir, sourceMapFile);

  const formData = {
    service_name: 'kibana-cases-plugin',
    service_version: require('../package.json').version,
    bundle_filepath: `/x-pack/platform/plugins/shared/cases/${sourceMapFile.replace('.map', '')}`,
    sourcemap: fs.createReadStream(filepath),
  };

  request.post(
    {
      url: 'http://localhost:5601/api/apm/sourcemaps',
      formData: formData,
      headers: {
        'kbn-xsrf': 'true',
        Authorization: 'ApiKey elastic:changeme',
      },
    },
    (err, resp, body) => {
      if (err) {
        console.error('Error uploading source map:', err);
      } else {
        console.log('Source map uploaded successfully');
      }
    }
  );
};

uploadSourceMap();
