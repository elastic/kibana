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
  EuiButtonEmpty
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';
import { LocalUIFilterName } from '../../../../server/lib/ui_filters/local_ui_filters/config';
import { Filter } from './Filter';
import { useLocalUIFilters } from '../../../hooks/useLocalUIFilters';
import { PROJECTION } from '../../../projections/typings';

interface Props {
  projection: PROJECTION;
  filterNames: LocalUIFilterName[];
  params?: Record<string, string | number | boolean | undefined>;
  showCount?: boolean;
  children?: React.ReactNode;
}

const ButtonWrapper = styled.div`
   {
    display: inline-block;
  }
`;

const LocalUIFilters = ({
  projection,
  params,
  filterNames,
  children,
  showCount = true
}: Props) => {
  const { data: filters, values, setValues } = useLocalUIFilters({
    filterNames,
    projection,
    params
  });

  return (
    <>
      <EuiTitle size="s">
        <h3>
          {i18n.translate('xpack.apm.localFiltersTitle', {
            defaultMessage: 'Filters'
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      {children}
      {filters.map(filter => {
        const { name } = filter;
        const filterValue = (name in values && values[name]) || [];

        return (
          <React.Fragment key={filter.name}>
            <Filter
              {...filter}
              onChange={value => {
                setValues({
                  ...values,
                  [filter.name]: value
                });
              }}
              value={filterValue}
              showCount={showCount}
            />
            <EuiHorizontalRule margin="none" />
          </React.Fragment>
        );
      })}
      <EuiSpacer size="s" />
      <ButtonWrapper>
        <EuiButtonEmpty
          size="xs"
          iconType="cross"
          flush="left"
          onClick={() => {
            const clearedValues = Object.keys(values).reduce(
              (acc, key) => {
                return {
                  ...acc,
                  [key]: []
                };
              },
              {} as Record<string, string[] | string>
            );
            setValues(clearedValues);
          }}
        >
          {i18n.translate('xpack.apm.clearFilters', {
            defaultMessage: 'Clear filters'
          })}
        </EuiButtonEmpty>
      </ButtonWrapper>
    </>
  );
};

export { LocalUIFilters };
