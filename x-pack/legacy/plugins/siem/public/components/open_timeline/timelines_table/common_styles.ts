/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiAvatar } from '@elastic/eui';
import styled from 'styled-components';

export const PositionedIcon = styled.div`
  position: relative;
  top: -2px;
`;

/**
 * The width of an action column, which must be wide enough to render a
 * two digit count without wrapping
 */
export const ACTION_COLUMN_WIDTH = '35px';

export const Avatar = styled(EuiAvatar)`
  margin-right: 5px;
  user-select: none;
`;
