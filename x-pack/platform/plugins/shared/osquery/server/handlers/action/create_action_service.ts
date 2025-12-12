/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ParsedTechnicalFields } from '@kbn/rule-registry-plugin/common';
import type { Subscription } from 'rxjs';
import type { CreateLiveQueryRequestBodySchema } from '../../../common/api';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import type { OsqueryActiveLicenses } from './validate_license';
import { validateLicense } from './validate_license';
import { createActionHandler } from './create_action_handler';

export interface CreateActionOptions {
  alertData?: ParsedTechnicalFields & { _index: string };
  space?: { id: string };
}

export const createActionService = (osqueryContext: OsqueryAppContext) => {
  let licenseSubscription: Subscription | null = null;
  const licenses: OsqueryActiveLicenses = { isActivePlatinumLicense: false };

  licenseSubscription = osqueryContext.licensing.license$.subscribe((license) => {
    licenses.isActivePlatinumLicense = license.isActive && license.hasAtLeast('platinum');
  });

  const logger = osqueryContext.logFactory.get('createActionService');

  const create = async (
    params: CreateLiveQueryRequestBodySchema,
    options?: CreateActionOptions
  ) => {
    const error = validateLicense(licenses);

    return createActionHandler(osqueryContext, params, {
      alertData: options?.alertData,
      space: options?.space,
      error,
    });
  };

  const stop = () => {
    if (licenseSubscription) {
      licenseSubscription.unsubscribe();
    }
  };

  return {
    create,
    stop,
    logger,
  };
};
