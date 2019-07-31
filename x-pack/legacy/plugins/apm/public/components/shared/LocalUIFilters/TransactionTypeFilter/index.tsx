/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiTitle,
  EuiHorizontalRule,
  EuiSpacer,
  EuiSelect
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { pick } from 'lodash';
import { useUrlParams } from '../../../../hooks/useUrlParams';
import { history } from '../../../../utils/history';
import { fromQuery, toQuery } from '../../Links/url_helpers';

interface Props {
  transactionTypes: string[];
  showEmptyOption?: boolean;
}

const TransactionTypeFilter: React.FC<Props> = ({
  transactionTypes,
  showEmptyOption = false
}) => {
  const {
    urlParams: { transactionType }
  } = useUrlParams();

  let options = transactionTypes.map(type => ({
    text: `${type}`,
    value: type
  }));

  if (showEmptyOption) {
    options = [
      {
        text: i18n.translate('xpack.apm.localFilters.transactionTypeAll', {
          defaultMessage: 'All'
        }),
        value: ''
      },
      ...options
    ];
  }

  return (
    <>
      <EuiTitle size="xxxs" textTransform="uppercase">
        <h4>
          {i18n.translate('xpack.apm.localFilters.titles.transactionType', {
            defaultMessage: 'Transaction type'
          })}
        </h4>
      </EuiTitle>
      <EuiHorizontalRule margin="none" />
      <EuiSpacer size="s" />
      <EuiSelect
        options={options}
        value={transactionType}
        compressed={true}
        onChange={event => {
          const newLocation = {
            ...history.location,
            search: fromQuery(
              pick(
                {
                  ...toQuery(history.location.search),
                  transactionType: event.target.value
                },
                Boolean
              )
            )
          };
          history.push(newLocation);
        }}
      />
      <EuiSpacer size="s" />
      <EuiHorizontalRule margin="none" />
    </>
  );
};

export { TransactionTypeFilter };
