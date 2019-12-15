/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// This file redirects lens urls starting with app/lens#... to their counterpart on app/kibana#lens/... to
// make sure it's compatible with the 7.5 release

import { npSetup } from 'ui/new_platform';
import chrome from 'ui/chrome';

chrome.setRootController('lens', () => {
  // prefix the path in the hash with lens/
  const prefixedHashRoute = window.location.hash.replace(/^#\//, '#/lens/');

  // redirect to the new lens url `app/kibana#/lens/...`
  window.location.href = npSetup.core.http.basePath.prepend('/app/kibana' + prefixedHashRoute);
});
