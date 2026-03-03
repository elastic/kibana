/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Owner } from '../../common/constants/types';

const CASES_EXTENDED_FIELDS_INDEX_BASE = '.internal.cases-extended-fields';

export const getExtendedFieldsDestinationIndexName = (spaceId: string, owner: Owner): string =>
  `${CASES_EXTENDED_FIELDS_INDEX_BASE}.${owner}-${spaceId}`.toLowerCase();
