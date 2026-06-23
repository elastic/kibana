/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export class EarsConfigError extends Error {
  static readonly userMessage = i18n.translate('xpack.actions.earsConfigError.userMessage', {
    defaultMessage:
      'OAuth authorization failed: the EARS integration is misconfigured on this server. Contact your administrator.',
  });

  constructor(message: string) {
    super(message);
    this.name = 'EarsConfigError';
  }
}
