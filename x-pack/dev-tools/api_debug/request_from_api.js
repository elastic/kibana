/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import fetch from 'node-fetch';
import { resolve } from 'path';
import abab from 'abab';
import pkg from '../../package.json';

function getRequestParams(argv) {
  // use `--host=https://somedomain.com:5601` or else http://localhost:5601 is defaulted
  const host = argv.host || 'http://localhost:5601';
  // use `--auth=myuser:mypassword` or else elastic:changeme is defaulted
  // passing `--auth` with no value effectively sends no auth
  const auth = argv.auth || 'elastic:changeme';
  const authStr = abab.btoa(auth);
  // auto-add a leading slash to basePath
  const basePath = argv.basePath ? '/' + argv.basePath : '';

  return {
    host,
    auth: `Basic ${authStr}`,
    basePath,
  };
}

function getRequestHeaders(auth) {
  return {
    'kbn-version': pkg.version,
    'Content-Type': 'application/json',
    Authorization: auth,
  };
}

function setIgnoreSSLErrors() {
  // use `-k` to let fetch ignore SSL errors
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

function logHeaders(res) {
  // use `--headers` to print the response headers
  const headers = res.headers.raw();
  for (const key in headers) {
    if (headers.hasOwnProperty(key)) {
      console.log(`${key}: ${headers[key]}`);
    }
  }
  console.log('\n');
}

function prettyPrintJson(json) {
  console.log(JSON.stringify(json, null, ' '));
}

export async function requestFromApi(argv, requestType) {
  const pattern = resolve(__dirname, `./apis/${requestType}/index.js`);
  const { method, path, body } = require(pattern); // eslint-disable-line import/no-dynamic-require
  const { host, auth, basePath } = getRequestParams(argv);
  if (argv.k || !argv.ssl) {
    setIgnoreSSLErrors();
  }

  // make the request
  const params = { method, headers: getRequestHeaders(auth) };
  if (body) {
    params.body = JSON.stringify(body);
  }
  const uri = host + basePath + path;
  const res = await fetch(uri, params);

  if (argv.headers) {
    logHeaders(res);
  }

  const json = await res.json();
  prettyPrintJson(json);
}
