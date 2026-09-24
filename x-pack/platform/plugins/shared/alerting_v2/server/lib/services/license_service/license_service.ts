/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { PluginStart } from '@kbn/core-di';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import { inject, injectable } from 'inversify';
import {
  ACTION_POLICIES_REQUIRED_LICENSE,
  isActionPoliciesLicenseValid,
} from '../../../../common/action_policies_license';
import type { AlertingServerStartDependencies } from '../../../types';
import { ALERTING_ERROR_CODES } from '../../errors/error_codes';
import { getActionPolicyLicenseNotSupportedMessage } from '../../errors/action_policy_error_messages';

export interface LicenseServiceContract {
  assertActionPoliciesLicense(): Promise<void>;
}

@injectable()
export class LicenseService implements LicenseServiceContract {
  constructor(
    @inject(PluginStart<AlertingServerStartDependencies['licensing']>('licensing'))
    private readonly licensing: LicensingPluginStart
  ) {}

  public async assertActionPoliciesLicense(): Promise<void> {
    const license = await this.licensing.getLicense();
    if (isActionPoliciesLicenseValid(license)) {
      return;
    }

    throw Boom.forbidden(
      getActionPolicyLicenseNotSupportedMessage(ACTION_POLICIES_REQUIRED_LICENSE),
      {
        code: ALERTING_ERROR_CODES.ACTION_POLICY_LICENSE_NOT_SUPPORTED,
        details: {
          required_license: ACTION_POLICIES_REQUIRED_LICENSE,
          current_license: license.type ?? null,
          license_status: license.status ?? null,
        },
      }
    );
  }
}
