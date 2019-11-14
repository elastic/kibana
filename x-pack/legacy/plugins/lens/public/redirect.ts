/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// This file redirects lens urls starting with app/lens#... to their counterpart on app/kibana#lens/... to
// make sure it's compatible with the 7.5 release

const newUrl =
  // replace app/lens in the path with app/kibana
  window.location.pathname.replace(/app\/lens$/, 'app/kibana') +
  // prefix the path in the url with lens
  window.location.hash.replace(/^#\//, '#/lens/');

// redirect
window.location.href = window.location.href.replace(
  window.location.pathname + window.location.hash,
  newUrl
);
