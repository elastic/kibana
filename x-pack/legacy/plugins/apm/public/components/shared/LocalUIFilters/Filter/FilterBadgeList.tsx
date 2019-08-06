/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexGrid, EuiFlexItem, EuiBadge, EuiIcon } from '@elastic/eui';
import styled from 'styled-components';
import { unit, px } from '../../../../style/variables';

const BadgeText = styled.div`
  display: inline-block;
  max-width: ${px(unit * 8)};
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: middle;
`;

interface Props {
  value: string[];
  onChange: (value: string[]) => void;
}

const FilterBadgeList = ({ onChange, value }: Props) => (
  <EuiFlexGrid gutterSize="s">
    {value.map(val => (
      <EuiFlexItem key={val} grow={false}>
        <button
          type="button"
          onClick={() => {
            onChange(value.filter(v => val !== v));
          }}
        >
          <EuiBadge color="hollow">
            <BadgeText>{val}</BadgeText>
            <EuiIcon type="cross"></EuiIcon>
          </EuiBadge>
        </button>
      </EuiFlexItem>
    ))}
  </EuiFlexGrid>
);

export { FilterBadgeList };
