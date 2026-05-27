/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Expected values encoded in the cloud.id server arg:
//   ftr_fake_cloud_id:aGVsbG8uY29tOjQ0MyRFUzEyM2FiYyRrYm4xMjNhYmM=
//   base64 decodes to: hello.com:443$ES123abc$kbn123abc
export const EXPECTED_ES_URL = 'https://ES123abc.hello.com:443';
export const EXPECTED_CLOUD_ID = 'ftr_fake_cloud_id:aGVsbG8uY29tOjQ0MyRFUzEyM2FiYyRrYm4xMjNhYmM=';

// From @kbn/product-intercept-plugin/common/constants — inlined to avoid kbn_references dependency
export const TRIAL_TRIGGER_DEF_ID = 'productTrialInterceptTrigger';

// localStorage key used by the intercepts prompter to track when an intercept was last shown
export const INTERCEPT_PROMPTER_LOCAL_STORAGE_KEY = 'intercepts.prompter.clientCache';

// Headers required by the internal cloud/solution endpoint
export const CLOUD_SOLUTION_HEADERS = {
  'kbn-xsrf': 'xxx',
  'x-elastic-internal-origin': 'cloud',
  'elastic-api-version': '1',
};
