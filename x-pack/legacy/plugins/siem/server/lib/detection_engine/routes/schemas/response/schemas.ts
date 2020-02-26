/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';
import { RiskScore } from '../types/risk_score';
import { UUID } from '../types/uuid';
import { IsoDateString } from '../types/iso_date_string';
import { PositiveIntegerGreaterThanZero } from '../types/positive_integer_greater_than_zero';
import { PositiveInteger } from '../types/positive_integer';

export const description = t.string;
export const enabled = t.boolean;
export const exclude_export_details = t.boolean;
export const false_positives = t.array(t.string);
export const file_name = t.string;

/**
 * TODO: Right now the filters is an "unknown", when it could more than likely
 * become the actual ESFilter as a type.
 */
export const filters = t.array(t.unknown); // Filters are not easily type-able yet

// TODO: Create a regular expression type or custom date math part type here
export const from = t.string;

export const immutable = t.boolean;

// Note: Never make this a strict uuid, we allow the rule_id to be any string at the moment
// in case we encounter 3rd party rule systems which might be using auto incrementing numbers
// or other different things.
export const rule_id = t.string;

export const id = UUID;
export const index = t.array(t.string);
export const interval = t.string;
export const query = t.string;
export const language = t.keyof({ kuery: null, lucene: null });
export const objects = t.array(t.type({ rule_id }));
export const output_index = t.string;
export const saved_id = t.string;
export const timeline_id = t.string;
export const timeline_title = t.string;

/**
 * Note that this is a plain unknown object because we allow the UI
 * to send us extra additional information as "meta" which can be anything.
 *
 * TODO: Strip away extra information and possibly even "freeze" this object
 * so we have tighter control over 3rd party data structures.
 */
export const meta = t.object;
export const max_signals = PositiveIntegerGreaterThanZero;
export const name = t.string;
export const risk_score = RiskScore;
export const severity = t.keyof({ low: null, medium: null, high: null, critical: null });
export const status = t.keyof({ open: null, closed: null });
export const job_status = t.keyof({ succeeded: null, failed: null, 'going to run': null });

// TODO: Create a regular expression type or custom date math part type here
export const to = t.string;

export const type = t.keyof({ query: null, saved_query: null });
export const queryFilter = t.string;
export const references = t.array(t.string);
export const per_page = PositiveInteger;
export const page = PositiveIntegerGreaterThanZero;
export const signal_ids = t.array(t.string);

// TODO: Can this be more strict or is this is the set of all Elastic Queries?
export const signal_status_query = t.object;

export const sort_field = t.string;
export const sort_order = t.keyof({ asc: null, desc: null });
export const tags = t.array(t.string);
export const fields = t.array(t.string);
export const threat_framework = t.string;
export const threat_tactic_id = t.string;
export const threat_tactic_name = t.string;
export const threat_tactic_reference = t.string;
export const threat_tactic = t.type({
  id: threat_tactic_id,
  name: threat_tactic_name,
  reference: threat_tactic_reference,
});
export const threat_technique_id = t.string;
export const threat_technique_name = t.string;
export const threat_technique_reference = t.string;
export const threat_technique = t.exact(
  t.type({
    id: threat_technique_id,
    name: threat_technique_name,
    reference: threat_technique_reference,
  })
);
export const threat_techniques = t.array(threat_technique);
export const threat = t.array(
  t.exact(
    t.type({
      framework: threat_framework,
      tactic: threat_tactic,
      technique: threat_techniques,
    })
  )
);
export const created_at = IsoDateString;
export const updated_at = IsoDateString;
export const updated_by = t.string;
export const created_by = t.string;
export const version = PositiveIntegerGreaterThanZero;
export const last_success_at = IsoDateString;
export const last_success_message = t.string;
export const last_failure_at = IsoDateString;
export const last_failure_message = t.string;
export const status_date = IsoDateString;
export const rules_installed = PositiveInteger;
export const rules_updated = PositiveInteger;
export const status_code = PositiveInteger;
export const message = t.string;
export const perPage = PositiveInteger;
export const total = PositiveInteger;
export const success = t.boolean;
export const success_count = PositiveInteger;
export const rules_custom_installed = PositiveInteger;
export const rules_not_installed = PositiveInteger;
export const rules_not_updated = PositiveInteger;
