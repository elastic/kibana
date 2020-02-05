/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Contains utility functions related to x-pack security.
 */

export function isSecurityDisabled(xpackMainPlugin) {
  const xpackInfo = xpackMainPlugin && xpackMainPlugin.info;
  // we assume that `xpack.isAvailable()` always returns `true` because we're inside x-pack
  // if for whatever reason it returns `false`, `isSecurityDisabled()` would also return `false`
  // which would result in follow-up behavior assuming security is enabled. This is intentional,
  // because it results in more defensive behavior.
  const securityInfo = xpackInfo && xpackInfo.isAvailable() && xpackInfo.feature('security');
  return securityInfo && securityInfo.isEnabled() === false;
}
