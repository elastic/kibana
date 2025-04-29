/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SPACE_IDS } from '../../common/technical_rule_data_field_names';

export function getSpacesFilter(spaceId?: string) {
  return spaceId ? { term: { [SPACE_IDS]: spaceId } } : undefined;
}
