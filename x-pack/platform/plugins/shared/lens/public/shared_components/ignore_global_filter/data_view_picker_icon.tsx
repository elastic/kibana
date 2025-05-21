/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React from 'react';

/**
 * Retrieve the IgnoreGlobalfilter shared icon to be put into the dataViewPicker within a Layer panel
 * @param dataTestSubj test id to be applied
 * @returns
 */
export const getIgnoreGlobalFilterIcon = ({
  color,
  dataTestSubj,
}: {
  color: string;
  dataTestSubj: string;
}) => {
  return {
    component: (
      <EuiIcon
        type={'filterIgnore'}
        color={color}
        css={css`
          margin-top: 5px;
        `}
      />
    ),
    tooltipValue: i18n.translate('xpack.lens.layerPanel.ignoreGlobalFilters', {
      defaultMessage: 'Ignore global filters',
    }),
    'data-test-subj': dataTestSubj,
  };
};
