/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPagination, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FIELD_PAGE_SIZE } from '../../constants';
import { useFieldRulesPanelContext } from './context';

export const FieldRulesPanelPagination = () => {
  const { filteredRules, fieldPageIndex, setFieldPageIndex } = useFieldRulesPanelContext();

  const pageCount = Math.max(1, Math.ceil(filteredRules.length / FIELD_PAGE_SIZE));

  if (filteredRules.length <= FIELD_PAGE_SIZE) {
    return null;
  }

  return (
    <>
      <EuiSpacer size="s" />
      <EuiPagination
        pageCount={pageCount}
        activePage={fieldPageIndex}
        onPageClick={setFieldPageIndex}
        aria-label={i18n.translate('anonymizationUi.profiles.fieldRules.paginationAriaLabel', {
          defaultMessage: 'Field rules pages',
        })}
        compressed
      />
      <EuiText size="xs" color="subdued">
        {i18n.translate('anonymizationUi.profiles.fieldRules.paginationSummary', {
          defaultMessage: '{count} rules total',
          values: { count: filteredRules.length },
        })}
      </EuiText>
    </>
  );
};
