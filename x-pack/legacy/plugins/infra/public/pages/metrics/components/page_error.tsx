/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GraphQLFormattedError } from 'graphql';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { ApolloError } from 'apollo-client';
import { InvalidNodeError } from './invalid_node';
import { InfraMetricsErrorCodes } from '../../../../common/errors';
import { DocumentTitle } from '../../../components/document_title';
import { ErrorPageBody } from '../../error';

interface Props {
  name: string;
  error: ApolloError;
}

export const PageError = ({ error, name }: Props) => {
  const invalidNodeError = error.graphQLErrors.some(
    (err: GraphQLFormattedError) => err.code === InfraMetricsErrorCodes.invalid_node
  );

  return (
    <>
      <DocumentTitle
        title={(previousTitle: string) =>
          i18n.translate('xpack.infra.metricDetailPage.documentTitleError', {
            defaultMessage: '{previousTitle} | Uh oh',
            values: {
              previousTitle,
            },
          })
        }
      />
      {invalidNodeError ? (
        <InvalidNodeError nodeName={name} />
      ) : (
        <ErrorPageBody message={error.message} />
      )}
    </>
  );
};
