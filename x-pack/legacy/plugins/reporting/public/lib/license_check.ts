/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LicenseCheckResult } from '../../types';
import { LICENSE_CHECK_STATE } from '../../../../../plugins/licensing/public';

export const getLinkState = (license: LICENSE_CHECK_STATE): LicenseCheckResult => {
  if (license === LICENSE_CHECK_STATE.Valid) {
    return {
      showLinks: true,
      enableLinks: true,
    };
  }

  if (license === LICENSE_CHECK_STATE.Expired) {
    return {
      showLinks: true,
      enableLinks: false,
    };
  }

  if (license === LICENSE_CHECK_STATE.Invalid) {
    return {
      showLinks: false,
      enableLinks: false,
    };
  }

  if (license === LICENSE_CHECK_STATE.Unavailable) {
    return {
      showLinks: true,
      enableLinks: false,
    };
  }

  return {
    showLinks: false,
    enableLinks: false,
  };
};
