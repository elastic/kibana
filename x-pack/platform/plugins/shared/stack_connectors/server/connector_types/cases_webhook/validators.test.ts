/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateCasesWebhookConfig } from './validators';
import { AuthType } from '@kbn/connector-schemas/common/auth';
import type { CasesWebhookPublicConfigurationType } from './types';
import type { ValidatorServices } from '@kbn/actions-plugin/server/types';

describe('validateCasesWebhookConfig', () => {
  it('throws an error for unsupported auth type', () => {
    const configObject: CasesWebhookPublicConfigurationType = {
      createCommentUrl: 'https://example.com/create-comment',
      createIncidentUrl: 'https://example.com/create-incident',
      viewIncidentUrl: 'https://example.com/view-incident',
      getIncidentUrl: 'https://example.com/get-incident',
      updateIncidentUrl: 'https://example.com/update-incident',
      authType: AuthType.OAuth2ClientCredentials,
    } as unknown as CasesWebhookPublicConfigurationType;

    expect(() =>
      validateCasesWebhookConfig(configObject, {} as ValidatorServices)
    ).toThrowErrorMatchingInlineSnapshot(
      `"OAuth2 authentication is not supported for cases webhook connector"`
    );
  });
});
