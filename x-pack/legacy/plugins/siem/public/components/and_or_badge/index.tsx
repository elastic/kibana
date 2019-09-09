/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge } from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import * as i18n from './translations';

const RoundedBadge = styled(EuiBadge)`
  align-items: center;
  border-radius: 100%;
  display: inline-flex;
  font-size: 9px;
  height: 34px;
  justify-content: center;
  margin: 0 5px 0 5px;
  padding: 7px 6px 4px 6px;
  user-select: none;
  width: 34px;

  .euiBadge__content {
    position: relative;
    top: -1px;
  }

  .euiBadge__text {
    text-overflow: clip;
  }
`;

RoundedBadge.displayName = 'RoundedBadge';

export type AndOr = 'and' | 'or';

/** Displays AND / OR in a round badge */
export const AndOrBadge = pure<{ type: AndOr }>(({ type }) => {
  return (
    // Ref: https://github.com/elastic/eui/issues/1655
    // @ts-ignore
    <RoundedBadge data-test-subj="and-or-badge" color="hollow">
      {type === 'and' ? i18n.AND : i18n.OR}
    </RoundedBadge>
  );
});

AndOrBadge.displayName = 'AndOrBadge';
