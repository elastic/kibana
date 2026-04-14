/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/** Deployment / project label: chrome `project` name when set, else the switcher menu fallback. */
export function getProjectChromeDeploymentDisplayName(kibanaName: string | undefined): string {
  if (kibanaName) {
    return kibanaName;
  }
  return i18n.translate('xpack.spaces.navControl.projectChromeSwitcherRoot.deploymentName', {
    defaultMessage: 'Local deployment',
  });
}
