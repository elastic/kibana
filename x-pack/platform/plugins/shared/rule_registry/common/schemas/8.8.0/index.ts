/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_RULE_REVISION } from '@kbn/rule-data-utils';
import { CommonAlertFields870 } from '../8.7.0';

/* DO NOT MODIFY THIS SCHEMA TO ADD NEW FIELDS. These types represent the alerts that shipped in 8.8.0.
Any changes to these types should be bug fixes so the types more accurately represent the alerts from 8.8.0.

If you are adding new fields for a new release of Kibana, create a new sibling folder to this one
for the version to be released and add the field(s) to the schema in that folder.

Then, update `../index.ts` to import from the new folder that has the latest schemas, add the
new schemas to the union of all alert schemas, and re-export the new schemas as the `*Latest` schemas.
*/

export interface RevisionField880 {
  [ALERT_RULE_REVISION]: number;
}

export type CommonAlertFields880 = CommonAlertFields870 & RevisionField880;

export type CommonAlertFieldName880 = keyof CommonAlertFields880;

export type AlertWithCommonFields880<T> = T & CommonAlertFields880;
