/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import { Data } from '../../pages/task_manager/helpers/format_data';

export async function getOverview({ http }: { http: HttpSetup }): Promise<Data> {
  return await http.get<Data>(`/internal/task_manager/_overview`);
}
