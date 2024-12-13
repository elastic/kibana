/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCallOut } from '@elastic/eui';

interface Props {
  error: string | JSX.Element;
}

export const ErrorCallout: FC<Props> = ({ error }) => {
  let errorCallout = (
    <EuiCallOut
      title={i18n.translate('xpack.ml.dataframe.analytics.errorCallout.generalErrorTitle', {
        defaultMessage: 'An error occurred loading the data.',
      })}
      color="danger"
      iconType="cross"
    >
      <p>{error}</p>
    </EuiCallOut>
  );
  // Job was created but not started so the destination index has not been created
  if (typeof error === 'string' && error.includes('index_not_found')) {
    errorCallout = (
      <EuiCallOut
        title={i18n.translate('xpack.ml.dataframe.analytics.errorCallout.evaluateErrorTitle', {
          defaultMessage: 'An error occurred loading the data.',
        })}
        color="danger"
        iconType="cross"
      >
        <p>
          {i18n.translate('xpack.ml.dataframe.analytics.errorCallout.noIndexCalloutBody', {
            defaultMessage:
              'The query for the index returned no results. Please make sure the destination index exists and contains documents.',
          })}
        </p>
      </EuiCallOut>
    );
  } else if (typeof error === 'string' && error.includes('No documents found')) {
    // Job was started but no results have been written yet
    errorCallout = (
      <EuiCallOut
        title={i18n.translate('xpack.ml.dataframe.analytics.errorCallout.noDataCalloutTitle', {
          defaultMessage: 'Empty index query result.',
        })}
        color="primary"
      >
        <p>
          {i18n.translate('xpack.ml.dataframe.analytics.errorCallout.noDataCalloutBody', {
            defaultMessage:
              'The query for the index returned no results. Please make sure the job has completed and the index contains documents.',
          })}
        </p>
      </EuiCallOut>
    );
  } else if (typeof error === 'string' && error.includes('userProvidedQueryBuilder')) {
    // query bar syntax is incorrect
    errorCallout = (
      <EuiCallOut
        title={i18n.translate('xpack.ml.dataframe.analytics.errorCallout.queryParsingErrorTitle', {
          defaultMessage: 'Unable to parse query.',
        })}
        color="primary"
      >
        <p>
          {i18n.translate('xpack.ml.dataframe.analytics.errorCallout.queryParsingErrorBody', {
            defaultMessage:
              'The query syntax is invalid and returned no results. Please check the query syntax and try again.',
          })}
        </p>
      </EuiCallOut>
    );
  }

  return <Fragment>{errorCallout}</Fragment>;
};
