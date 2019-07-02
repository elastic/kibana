/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ml } from '../services/ml_api_service';

import { setUpgradeInProgress } from '../services/upgrade_service';
import { Privileges, getDefaultPrivileges } from '../../common/types/privileges';

export function getPrivileges(): Promise<Privileges> {
  return new Promise((resolve, reject) => {
    ml.checkMlPrivileges()
      .then(({ capabilities, upgradeInProgress }) => {
        if (upgradeInProgress === true) {
          setUpgradeInProgress(true);
        }
        resolve(capabilities);
      })
      .catch(() => {
        reject(getDefaultPrivileges());
      });
  });
}
