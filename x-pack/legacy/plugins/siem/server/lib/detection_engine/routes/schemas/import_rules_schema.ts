/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';

/* eslint-disable @typescript-eslint/camelcase */
import {
  enabled,
  description,
  false_positives,
  filters,
  from,
  immutable,
  index,
  rule_id,
  interval,
  query,
  language,
  output_index,
  saved_id,
  timeline_id,
  meta,
  risk_score,
  max_signals,
  name,
  severity,
  tags,
  to,
  type,
  threats,
  references,
  version,
} from './schemas';
/* eslint-enable @typescript-eslint/camelcase */

import { DEFAULT_MAX_SIGNALS } from '../../../../../common/constants';

/**
 * Differences from this and the createRulesSchema are
 *   - rule_id is required
 */

// TODO: Do we make _most_ of this required since an export should export all the major elements
// and then on an import we require all those fields and have a 1-1 between export and import?
export const importRulesSchema = Joi.object({
  description: description.required(),
  enabled: enabled.default(true),
  false_positives: false_positives.default([]),
  filters,
  from: from.required(),
  rule_id: rule_id.required(),
  immutable: immutable.default(false),
  index,
  interval: interval.default('5m'),
  query: query.allow('').default(''),
  language: language.default('kuery'),
  output_index,
  saved_id: saved_id.when('type', {
    is: 'saved_query',
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  }),
  timeline_id,
  meta,
  risk_score: risk_score.required(),
  max_signals: max_signals.default(DEFAULT_MAX_SIGNALS),
  name: name.required(),
  severity: severity.required(),
  tags: tags.default([]),
  to: to.required(),
  type: type.required(),
  threats: threats.default([]),
  references: references.default([]),
  version: version.default(1),
  // TODO: Add the extra fields of create_at, updated_at, created_by, etc... All the ones you would get on an export
});
