/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiToolTip } from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';

import {
  DEFAULT_CATEGORY_NAME,
  defaultHeaders,
} from '../timeline/body/column_headers/default_headers';
import { OnUpdateColumns } from '../timeline/events';

import * as i18n from './translations';

/**
 * The default category button allows the user to reset the fields shown in
 * the timeline with a single click
 */
export const DefaultCategoryButton = pure<{
  isLoading: boolean;
  onUpdateColumns: OnUpdateColumns;
}>(({ isLoading, onUpdateColumns }) => (
  <EuiToolTip content={i18n.VIEW_CATEGORY(DEFAULT_CATEGORY_NAME)}>
    <EuiButton
      color="primary"
      data-test-subj="quick-select-default-category"
      isLoading={isLoading}
      onClick={() => {
        onUpdateColumns(defaultHeaders);
      }}
      size="s"
    >
      {DEFAULT_CATEGORY_NAME}
    </EuiButton>
  </EuiToolTip>
));
