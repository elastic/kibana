/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FieldValueQueryBar } from '../query_bar';

<<<<<<< HEAD:x-pack/legacy/plugins/siem/public/pages/detection_engine/rules/components/step_define_rule/types.ts
export interface QueryBarStepDefineRule {
  queryBar: FieldValueQueryBar;
}
=======
export type AlertListData = AlertResultList;
export type AlertListState = AlertResultList & { url: string };
>>>>>>> url now mirrors pagination status:x-pack/plugins/endpoint/public/applications/endpoint/store/alerts/types.ts
