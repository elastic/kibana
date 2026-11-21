/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IndicesIndexSettings,
  MappingProperty,
  MappingTypeMapping,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  INVESTIGATION_ACTIVITY_INDEX,
  INVESTIGATION_CONFIG_INDEX,
  INVESTIGATION_ITEMS_INDEX,
  INVESTIGATION_RECORDS_INDEX,
} from '../../common/investigations/constants';

const keyword: MappingProperty = { type: 'keyword', ignore_above: 1024 };
const lowerKeyword: MappingProperty = {
  type: 'keyword',
  ignore_above: 1024,
  normalizer: 'investigation_lowercase',
};
const text: MappingProperty = { type: 'text' };
const textWithKeyword: MappingProperty = {
  type: 'text',
  fields: {
    keyword: { type: 'keyword', ignore_above: 1024, normalizer: 'investigation_lowercase' },
  },
};
const date: MappingProperty = { type: 'date' };
const bool: MappingProperty = { type: 'boolean' };
const long: MappingProperty = { type: 'long' };
const float: MappingProperty = { type: 'float' };
const stored: MappingProperty = { type: 'object', enabled: false };
const actor: MappingProperty = {
  properties: { type: keyword, id: keyword, name: keyword, on_behalf_of: keyword },
};

const SETTINGS: IndicesIndexSettings = {
  'index.hidden': true,
  'index.auto_expand_replicas': '0-1',
  'index.number_of_shards': 1,
  analysis: {
    normalizer: {
      investigation_lowercase: { type: 'custom', filter: ['lowercase'] },
    },
  },
};

export const RECORDS_MAPPING: MappingTypeMapping = {
  dynamic: false,
  dynamic_templates: [
    {
      fields_keyword: {
        path_match: 'fields.*_keyword',
        mapping: { type: 'keyword', ignore_above: 1024 },
      },
    },
    {
      fields_text: {
        path_match: 'fields.*_text',
        mapping: { type: 'text', fields: { keyword: { type: 'keyword', ignore_above: 1024 } } },
      },
    },
    { fields_long: { path_match: 'fields.*_long', mapping: { type: 'long' } } },
    { fields_double: { path_match: 'fields.*_double', mapping: { type: 'double' } } },
    { fields_date: { path_match: 'fields.*_date', mapping: { type: 'date' } } },
    { fields_bool: { path_match: 'fields.*_bool', mapping: { type: 'boolean' } } },
    { fields_other: { path_match: 'fields.*', mapping: { type: 'keyword', ignore_above: 1024 } } },
    {
      counters_numbers: {
        path_match: 'counters.*',
        match_mapping_type: 'long',
        mapping: { type: 'long' },
      },
    },
  ],
  properties: {
    id: keyword,
    case_id: keyword,
    space_id: keyword,
    display_id: lowerKeyword,
    display_num: long,
    title: textWithKeyword,
    description: text,
    summary: text,
    status: keyword,
    severity: keyword,
    severity_rank: long,
    priority: keyword,
    priority_rank: long,
    priority_note: text,
    tags: keyword,
    assignees: keyword,
    owner: actor,
    participants: actor,
    created_at: date,
    created_by: actor,
    updated_at: date,
    updated_by: actor,
    closed_at: date,
    investigation_type: keyword,
    template_id: keyword,
    status_key: keyword,
    paused_at: { type: 'date' },
    time_paused: { type: 'long' },
    pause_reason: keyword,
    resume_to_status_key: keyword,
    template_version: { type: 'integer' },
    stage: keyword,
    fields: { type: 'object', dynamic: true },
    agent_verdict: {
      properties: {
        label: keyword,
        confidence: float,
        classification: keyword,
        alternatives: stored,
        argument: stored,
        set_by: actor,
        set_at: date,
      },
    },
    analyst_verdict: {
      properties: { verdict: keyword, reason: text, set_by: actor, set_at: date },
    },
    verdict_effective: keyword,
    close_outcome: {
      properties: {
        verdict: keyword,
        reason: keyword,
        root_cause: keyword,
        summary: text,
        closed_by: actor,
        closed_at: date,
        alerts_closed: long,
        proposals_withdrawn: long,
      },
    },
    origin: { properties: { type: keyword, label: text, actor } },
    conversation_id: keyword,
    conversation_ids: keyword,
    threads: stored,
    ai_enabled: bool,
    agent_id: keyword,
    agent_name: keyword,
    restricted_to: keyword,
    counters: { type: 'object', dynamic: true },
    last_handoff: { properties: { at: date, by: actor, to: actor, note: text } },
    merged_into: keyword,
    merged_from: keyword,
    ref_counters: stored,
  },
};

export const ITEMS_MAPPING: MappingTypeMapping = {
  dynamic: false,
  properties: {
    id: keyword,
    record_id: keyword,
    space_id: keyword,
    kind: keyword,
    ref: lowerKeyword,
    ref_num: long,
    created_at: date,
    created_by: actor,
    updated_at: date,
    updated_by: actor,
    title: textWithKeyword,
    text,
    status: keyword,
    links: { properties: { relation: keyword, target_id: keyword } },
    restricted: bool,
    exclude_from_ai: bool,
    evidence: {
      properties: {
        type: keyword,
        why: text,
        source: {
          properties: {
            label: keyword,
            kind: keyword,
            index: keyword,
            id: keyword,
            url: { type: 'keyword', index: false },
            saved_object_id: keyword,
            file_id: keyword,
            conversation_id: keyword,
          },
        },
        indicator: { properties: { type: keyword, value: lowerKeyword } },
        alert: {
          properties: {
            id: keyword,
            index: keyword,
            rule_id: keyword,
            rule_name: keyword,
            severity: keyword,
            risk_score: float,
            host: lowerKeyword,
            user: lowerKeyword,
            timestamp: date,
          },
        },
        entity_id: keyword,
        snapshot: stored,
        snapshot_hash: keyword,
        preserved_at: date,
        source_expired: bool,
        integrity_note: text,
      },
    },
    claim: {
      properties: {
        question: text,
        conclusion: text,
        note: text,
        reasoning: text,
        confidence: float,
        needs_review: bool,
        supporting_evidence_ids: keyword,
        opposing_evidence_ids: keyword,
        gaps: text,
        source_message: stored,
        stale_reason: text,
        argument: stored,
      },
    },
    entity: {
      properties: {
        type: keyword,
        name: lowerKeyword,
        criticality: keyword,
        risk_score: float,
        risk_level: keyword,
        evidence_ids: keyword,
        attributes: stored,
        tags: keyword,
        position: stored,
      },
    },
    link: {
      properties: {
        from_id: keyword,
        to_id: keyword,
        kind: keyword,
        label: text,
        evidence_ids: keyword,
        description: text,
        claim_id: keyword,
      },
    },
    task: {
      properties: {
        phase: keyword,
        description: text,
        required: bool,
        owner: { properties: { type: keyword, id: keyword, name: keyword } },
        depends_on: keyword,
        auto: {
          properties: {
            type: keyword,
            claim_id: keyword,
            question: lowerKeyword,
            category: keyword,
          },
        },
        skip_reason: text,
        note: text,
        completed_by: actor,
        completed_at: date,
        template_ref: keyword,
        order: long,
      },
    },
    comment: { properties: { target_id: keyword, parent_id: keyword } },
    proposal: {
      properties: {
        category: keyword,
        effect: text,
        disruption: keyword,
        confirm_label: keyword,
        scope: stored,
        evidence_ids: keyword,
        revision: long,
        decision: { properties: { by: actor, at: date, reason: keyword, note: text } },
        argument: stored,
        suggestions: stored,
        revisions: stored,
      },
    },
    timeline_event: {
      properties: {
        occurred_at: date,
        stage: keyword,
        mitre: keyword,
        actor: { properties: { name: keyword, sub: keyword, kind: keyword } },
        source: keyword,
        alert_severity: keyword,
        flag: keyword,
        links: stored,
      },
    },
  },
};

export const ACTIVITY_MAPPING: MappingTypeMapping = {
  dynamic: false,
  properties: {
    id: keyword,
    record_id: keyword,
    space_id: keyword,
    ts: date,
    actor,
    action: keyword,
    target: { properties: { kind: keyword, id: keyword, ref: keyword, title: text } },
    message: text,
    details: text,
    links: stored,
    before: stored,
    after: stored,
  },
};

export const CONFIG_MAPPING: MappingTypeMapping = {
  dynamic: false,
  properties: {
    doc_type: keyword,
    space_id: keyword,
    type: keyword,
    tasks: stored,
    updated_at: date,
    updated_by: actor,
  },
};

const ensureIndex = async (
  esClient: ElasticsearchClient,
  logger: Logger,
  index: string,
  mappings: MappingTypeMapping
): Promise<void> => {
  try {
    const exists = await esClient.indices.exists({ index });
    if (exists) {
      await esClient.indices.putMapping({
        index,
        properties: mappings.properties,
        dynamic_templates: mappings.dynamic_templates,
      });
      return;
    }
    await esClient.indices.create({ index, settings: SETTINGS, mappings });
    logger.info(`Created investigation index ${index}`);
  } catch (error) {
    const type = error?.body?.error?.type ?? error?.meta?.body?.error?.type;
    if (type === 'resource_already_exists_exception') {
      return;
    }
    throw error;
  }
};

/** Creates or updates the four investigation indices. Safe to call on every start. */
export const ensureInvestigationIndices = async (
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<void> => {
  await Promise.all([
    ensureIndex(esClient, logger, INVESTIGATION_RECORDS_INDEX, RECORDS_MAPPING),
    ensureIndex(esClient, logger, INVESTIGATION_ITEMS_INDEX, ITEMS_MAPPING),
    ensureIndex(esClient, logger, INVESTIGATION_ACTIVITY_INDEX, ACTIVITY_MAPPING),
    ensureIndex(esClient, logger, INVESTIGATION_CONFIG_INDEX, CONFIG_MAPPING),
  ]);
};
