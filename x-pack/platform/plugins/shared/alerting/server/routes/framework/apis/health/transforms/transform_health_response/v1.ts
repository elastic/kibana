/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertingFrameworkHealth } from '../../../../../../types';
import type { HealthFrameworkResponseBodyV1 } from '../../../../../../../common/routes/framework/apis/health';

export const transformHealthBodyResponse = (
  frameworkHealth: AlertingFrameworkHealth
): HealthFrameworkResponseBodyV1 => ({
  is_sufficiently_secure: frameworkHealth.isSufficientlySecure,
  has_permanent_encryption_key: frameworkHealth.hasPermanentEncryptionKey,
  alerting_framework_health: {
    decryption_health: frameworkHealth.alertingFrameworkHealth.decryptionHealth,
    execution_health: frameworkHealth.alertingFrameworkHealth.executionHealth,
    read_health: frameworkHealth.alertingFrameworkHealth.readHealth,
  },
});
