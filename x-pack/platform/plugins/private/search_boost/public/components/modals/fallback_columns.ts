/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FallbackTarget } from '../../../common/types';
import { NEW_PROFILE_COLUMN, NEW_RULE_COLUMN } from '../../translations';
import type { ModalTableColumn } from './modal_table';

const EMPTY_VALUE = '—';

export const FALLBACK_COLUMNS: ReadonlyArray<ModalTableColumn<FallbackTarget>> = [
  {
    id: 'nextRule',
    name: NEW_RULE_COLUMN,
    render: ({ nextRuleName }) => nextRuleName ?? EMPTY_VALUE,
  },
  {
    id: 'nextProfile',
    name: NEW_PROFILE_COLUMN,
    render: ({ nextProfileName }) => nextProfileName ?? EMPTY_VALUE,
  },
];
