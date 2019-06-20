/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { GraphQLError } from 'graphql';

export const formatUptimeGraphQLErrorList = (errors: GraphQLError[]) =>
  errors.reduce(
    (errorString, error) =>
      errorString.concat(
        `${i18n.translate('xpack.uptime.errorMessage', {
          values: { message: error.message },
          defaultMessage: 'Error: {message}',
        })}\n`
      ),
    ''
  );
