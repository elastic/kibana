/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import axios from 'axios';
import { FETCH_TIMEOUT } from './constants';

export const fetch = axios.create({
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'kbn-xsrf': 'professionally-crafted-string-of-text',
  },
  timeout: FETCH_TIMEOUT,
});

export const arrayBufferFetch = axios.create({
  responseType: 'arraybuffer',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'kbn-xsrf': 'professionally-crafted-string-of-text',
  },
  timeout: FETCH_TIMEOUT,
});
