/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  // @ts-ignore
  EuiHighlight,
} from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

const FieldBadgeFlexGroup = styled(EuiFlexGroup)`
  height: 38px;
`;

const FieldBadgeFlexItem = styled(EuiFlexItem)`
  font-weight: bold;
`;

/**
 * The name of a (draggable) field
 */
export const FieldNameContainer = styled.div`
  padding: 5px;
  &:hover {
    transition: background-color 0.7s ease;
    background-color: #000;
    color: #fff;
  }
`;

/**
 * Renders a field (e.g. `event.action`) as a draggable badge
 */
export const DraggableFieldBadge = pure<{ fieldId: string }>(({ fieldId }) => (
  <EuiBadge color="#000">
    <FieldBadgeFlexGroup alignItems="center" justifyContent="center" gutterSize="none">
      <FieldBadgeFlexItem data-test-subj="field" grow={false}>
        {fieldId}
      </FieldBadgeFlexItem>
    </FieldBadgeFlexGroup>
  </EuiBadge>
));
