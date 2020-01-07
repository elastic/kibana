/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFilterButton, EuiFilterGroup } from '@elastic/eui';
import React from 'react';

import { FlowDirection } from '../../graphql/types';

import * as i18n from './translations';

interface Props {
  selectedDirection: FlowDirection;
  onChangeDirection: (value: FlowDirection) => void;
}

export const FlowDirectionSelect = React.memo<Props>(({ onChangeDirection, selectedDirection }) => (
  <EuiFilterGroup>
    <EuiFilterButton
      data-test-subj={FlowDirection.uniDirectional}
      hasActiveFilters={selectedDirection === FlowDirection.uniDirectional}
      withNext
      onClick={() => onChangeDirection(FlowDirection.uniDirectional)}
    >
      {i18n.UNIDIRECTIONAL}
    </EuiFilterButton>

    <EuiFilterButton
      data-test-subj={FlowDirection.biDirectional}
      hasActiveFilters={selectedDirection === FlowDirection.biDirectional}
      onClick={() => onChangeDirection(FlowDirection.biDirectional)}
    >
      {i18n.BIDIRECTIONAL}
    </EuiFilterButton>
  </EuiFilterGroup>
));

FlowDirectionSelect.displayName = 'FlowDirectionSelect';
