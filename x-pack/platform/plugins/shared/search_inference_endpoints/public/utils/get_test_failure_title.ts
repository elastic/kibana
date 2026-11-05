/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { TestEndpointFailureCause } from '../../common/types';

export const getTestFailureTitle = (cause: TestEndpointFailureCause) => {
  switch (cause) {
    case 'auth':
      return i18n.translate('xpack.searchInferenceEndpoints.testEndpoint.failure.auth', {
        defaultMessage: 'Authentication failed. Check the API key.',
      });
    case 'quota':
      return i18n.translate('xpack.searchInferenceEndpoints.testEndpoint.failure.quota', {
        defaultMessage: 'Rate limit or quota exceeded.',
      });
    case 'timeout':
      return i18n.translate('xpack.searchInferenceEndpoints.testEndpoint.failure.timeout', {
        defaultMessage: 'The endpoint did not respond in time.',
      });
    case 'not_found':
      return i18n.translate('xpack.searchInferenceEndpoints.testEndpoint.failure.notFound', {
        defaultMessage: 'Endpoint or model not found. Check the model ID.',
      });
    case 'bad_request':
      return i18n.translate('xpack.searchInferenceEndpoints.testEndpoint.failure.badRequest', {
        defaultMessage: 'The provider rejected the request.',
      });
    case 'provider_error':
      return i18n.translate('xpack.searchInferenceEndpoints.testEndpoint.failure.providerError', {
        defaultMessage: 'The provider had an error. Try again later.',
      });
    case 'no_endpoint':
      return i18n.translate('xpack.searchInferenceEndpoints.testEndpoint.failure.noEndpoint', {
        defaultMessage: 'No model is available for this feature.',
      });
    default:
      return i18n.translate('xpack.searchInferenceEndpoints.testEndpoint.failure.unknown', {
        defaultMessage: 'The endpoint test failed.',
      });
  }
};
