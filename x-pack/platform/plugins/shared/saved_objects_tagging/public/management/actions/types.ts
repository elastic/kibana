/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Action as EuiTableAction } from '@elastic/eui/src/components/basic_table/action_types';
import { TagWithRelations } from '../../../common/types';

export type TagAction = EuiTableAction<TagWithRelations> & {
  id: string;
};
