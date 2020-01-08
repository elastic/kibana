/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCallOut } from '@elastic/eui';

interface Props {
  error: string;
}

export const ErrorCallout: FC<Props> = ({ error }) => {
  let errorCallout = (
    <EuiCallOut
      title={i18n.translate('xpack.ml.dataframe.analytics.regressionExploration.generalError', {
        defaultMessage: 'An error occurred loading the data.',
      })}
      color="danger"
      iconType="cross"
    >
      <p>{error}</p>
    </EuiCallOut>
  );
  // Job was created but not started so the destination index has not been created
  if (error.includes('index_not_found')) {
    errorCallout = (
      <EuiCallOut
        title={i18n.translate('xpack.ml.dataframe.analytics.regressionExploration.evaluateError', {
          defaultMessage: 'An error occurred loading the data.',
        })}
        color="danger"
        iconType="cross"
      >
        <p>
          {i18n.translate('xpack.ml.dataframe.analytics.regressionExploration.noIndexCalloutBody', {
            defaultMessage:
              'The query for the index returned no results. Please make sure the destination index exists and contains documents.',
          })}
        </p>
      </EuiCallOut>
    );
  } else if (error.includes('No documents found')) {
    // Job was started but no results have been written yet
    errorCallout = (
      <EuiCallOut
        title={i18n.translate(
          'xpack.ml.dataframe.analytics.regressionExploration.noDataCalloutTitle',
          {
            defaultMessage: 'Empty index query result.',
          }
        )}
        color="primary"
      >
        <p>
          {i18n.translate('xpack.ml.dataframe.analytics.regressionExploration.noDataCalloutBody', {
            defaultMessage:
              'The query for the index returned no results. Please make sure the job has completed and the index contains documents.',
          })}
        </p>
      </EuiCallOut>
    );
  } else if (error.includes('userProvidedQueryBuilder')) {
    // query bar syntax is incorrect
    errorCallout = (
      <EuiCallOut
        title={i18n.translate(
          'xpack.ml.dataframe.analytics.regressionExploration.queryParsingErrorMessage',
          {
            defaultMessage: 'Unable to parse query.',
          }
        )}
        color="primary"
      >
        <p>
          {i18n.translate(
            'xpack.ml.dataframe.analytics.regressionExploration.queryParsingErrorBody',
            {
              defaultMessage:
                'The query syntax is invalid and returned no results. Please check the query syntax and try again.',
            }
          )}
        </p>
      </EuiCallOut>
    );
  }

  return <Fragment>{errorCallout}</Fragment>;
};
