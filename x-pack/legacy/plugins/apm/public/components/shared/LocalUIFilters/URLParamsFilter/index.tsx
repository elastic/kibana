/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import {
  EuiTitle,
  EuiSpacer,
  EuiHorizontalRule,
  EuiSelect
} from '@elastic/eui';
import { history } from '../../../../utils/history';
import { fromQuery, toQuery, APMQueryParams } from '../../Links/url_helpers';
import { useUrlParams } from '../../../../hooks/useUrlParams';
import { IUrlParams } from '../../../../context/UrlParamsContext/types';

interface Props {
  title: string;
  urlParamKey: keyof APMQueryParams & keyof IUrlParams;
  options: Array<{
    text: string;
    value: string;
  }>;
}

export const URLParamsFilter = ({ title, urlParamKey, options }: Props) => {
  const { urlParams } = useUrlParams();
  const value = urlParams[urlParamKey];

  if (typeof value === 'boolean') {
    throw new Error('Booleans are not supported');
  }

  return (
    <>
      <EuiTitle size="xxxs" textTransform="uppercase">
        <h4>{title}</h4>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiHorizontalRule margin="none" />
      <EuiSpacer size="s" />
      <EuiSelect
        options={options}
        value={value}
        compressed={true}
        onChange={event => {
          const newLocation = {
            ...history.location,
            search: fromQuery({
              ...toQuery(history.location.search),
              [urlParamKey]: event.target.value
            })
          };
          history.push(newLocation);
        }}
      />
    </>
  );
};
