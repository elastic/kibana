/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const fetch = require('node-fetch');
const base64stream = require('base64-stream');

export function testImage(html, cb) {
  fetch('http://localhost:8080', { method: 'POST', body: html })
    .then((res) => {
      return new Promise((resolve) => {
        let chunks = [];
        const myStream = res.body.pipe(base64stream.encode());
        myStream.on('data', (chunk) => {
          chunks = chunks.concat(chunk);
        });
        myStream.on('end', () => {
          resolve(chunks.toString('base64'));
        });
      });
    })
    .then(cb);
}
