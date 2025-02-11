/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';

import { FormattedMessage } from '@kbn/i18n-react';
import { EuiEmptyPrompt } from '@elastic/eui';
import type { DataViewField } from '@kbn/data-views-plugin/public';

interface Props {
  eventRateLength: number;
  fields?: DataViewField[];
  categoriesLength: number | null;
  loading: boolean;
}

export const InformationText: FC<Props> = ({
  eventRateLength,
  fields,
  categoriesLength,
  loading,
}) => {
  if (loading === true) {
    return null;
  }

  if (fields?.length === 0) {
    return (
      <EuiEmptyPrompt
        title={
          <h2>
            <FormattedMessage
              id="xpack.aiops.logCategorization.noTextFieldsTitle"
              defaultMessage="No text fields found"
            />
          </h2>
        }
        titleSize="xs"
        body={
          <p>
            <FormattedMessage
              id="xpack.aiops.logCategorization.noTextFieldsBody"
              defaultMessage="Pattern analysis can only be run on text fields."
            />
          </p>
        }
        data-test-subj="aiopsNoTextFieldsEmptyPrompt"
      />
    );
  }

  if (eventRateLength === 0) {
    return (
      <EuiEmptyPrompt
        title={
          <h2>
            <FormattedMessage
              id="xpack.aiops.logCategorization.noDocsTitle"
              defaultMessage="No documents found"
            />
          </h2>
        }
        titleSize="xs"
        body={
          <p>
            <FormattedMessage
              id="xpack.aiops.logCategorization.noDocsBody"
              defaultMessage="Ensure the selected time range contains documents."
            />
          </p>
        }
        data-test-subj="aiopsNoDocsEmptyPrompt"
      />
    );
  }

  if (eventRateLength > 0 && categoriesLength === null) {
    return (
      <EuiEmptyPrompt
        title={
          <h2>
            <FormattedMessage
              id="xpack.aiops.logCategorization.emptyPromptTitle"
              defaultMessage="Select a text field and click run pattern analysis to start analysis"
            />
          </h2>
        }
        titleSize="xs"
        body={
          <p>
            <FormattedMessage
              id="xpack.aiops.logCategorization.emptyPromptBody"
              defaultMessage="Log pattern analysis groups messages into common patterns."
            />
          </p>
        }
        data-test-subj="aiopsNoWindowParametersEmptyPrompt"
      />
    );
  }

  if (eventRateLength > 0 && categoriesLength !== null && categoriesLength === 0) {
    return (
      <EuiEmptyPrompt
        title={
          <h2>
            <FormattedMessage
              id="xpack.aiops.logCategorization.noCategoriesTitle"
              defaultMessage="No patterns found"
            />
          </h2>
        }
        titleSize="xs"
        body={
          <p>
            <FormattedMessage
              id="xpack.aiops.logCategorization.noCategoriesBody"
              defaultMessage="Ensure the selected field is populated in the selected time range."
            />
          </p>
        }
        data-test-subj="aiopsNoCategoriesEmptyPrompt"
      />
    );
  }

  return null;
};
