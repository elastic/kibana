/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const fs = require('fs');
const request = require('request');

const uploadSourceMap = () => {
  const filepath = './build/cases.bundle.js.map'; // Adjust this path
  const formData = {
    service_name: 'kibana-cases-plugin',
    service_version: '1.0.0',
    bundle_filepath: '/plugins/cases/cases.bundle.js',
    sourcemap: fs.createReadStream(filepath),
  };

  request.post(
    {
      url: 'http://localhost:5601/api/apm/sourcemaps',
      formData: formData,
      headers: {
        'kbn-xsrf': 'true',
        Authorization: 'ApiKey YOUR_API_KEY_HERE',
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
