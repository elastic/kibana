/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  FeatureUsageServiceSetup,
  FeatureUsageServiceStart,
} from '@kbn/licensing-plugin/server';

interface SetupDeps {
  featureUsage: FeatureUsageServiceSetup;
}

interface StartDeps {
  featureUsage: FeatureUsageServiceStart;
}

export interface SecurityFeatureUsageServiceStart {
  recordPreAccessAgreementUsage: () => void;
  recordSubFeaturePrivilegeUsage: () => void;
  recordAuditLoggingUsage: () => void;
}

export class SecurityFeatureUsageService {
  public setup({ featureUsage }: SetupDeps) {
    featureUsage.register('Subfeature privileges', 'gold');
    featureUsage.register('Pre-access agreement', 'gold');
    featureUsage.register('Audit logging', 'gold');
  }

  public start({ featureUsage }: StartDeps): SecurityFeatureUsageServiceStart {
    return {
      recordPreAccessAgreementUsage() {
        featureUsage.notifyUsage('Pre-access agreement');
      },
      recordSubFeaturePrivilegeUsage() {
        featureUsage.notifyUsage('Subfeature privileges');
      },
      recordAuditLoggingUsage() {
        featureUsage.notifyUsage('Audit logging');
      },
    };
  }
}
