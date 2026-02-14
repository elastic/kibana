/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';
import { EuiButtonEmpty, EuiForm, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { SearchItems } from '../../../../hooks/use_search_items';

interface StepSelectDataSummaryProps {
  searchItems: SearchItems;
  onEditDataSource: () => void;
}

export const StepSelectDataSummary: FC<StepSelectDataSummaryProps> = ({
  searchItems,
  onEditDataSource,
}) => {
  const isDiscoverSession = searchItems.savedSearch?.id !== undefined;

  const label = i18n.translate('xpack.transform.stepSelectDataSummary.sourceLabel', {
    defaultMessage: 'Data source',
  });

  const value = isDiscoverSession
    ? i18n.translate('xpack.transform.stepSelectDataSummary.discoverSessionValue', {
        defaultMessage: 'Discover session: {title}',
        values: { title: searchItems.savedSearch.title },
      })
    : searchItems.dataView.getIndexPattern();

  return (
    <div data-test-subj="transformStepSelectDataSummary">
      <EuiForm>
        <EuiFormRow label={label}>
          <span>{value}</span>
        </EuiFormRow>
        <EuiButtonEmpty
          flush="left"
          size="xs"
          iconType="pencil"
          onClick={onEditDataSource}
          data-test-subj="transformStepSelectDataEditSourceButton"
        >
          {i18n.translate('xpack.transform.stepSelectDataSummary.editSourceButton', {
            defaultMessage: 'Edit data source',
          })}
        </EuiButtonEmpty>
      </EuiForm>
    </div>
  );
};
