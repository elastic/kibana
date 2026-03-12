/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';

/**
 * Merged mapping for the content analytics index that serves cases, comments,
 * and attachments in a single index. The `doc_type` field acts as a discriminator.
 *
 * dynamic_templates at the root control auto-typing of `extended_fields.*_as_<type>`
 * sub-fields, so they are indexed with native types (long, ip, boolean, etc.) while
 * the parent `extended_fields` object remains `dynamic: true`.
 */
export const CAI_CONTENT_INDEX_MAPPINGS: MappingTypeMapping = {
  dynamic: false,
  properties: {
    // --- Common timestamp ---
    '@timestamp': { type: 'date' },

    // --- Discriminator ---
    doc_type: { type: 'keyword' }, // 'case' | 'comment' | 'attachment'

    // --- Common fields (present on all doc_types) ---
    case_id: { type: 'keyword' },
    owner: { type: 'keyword' },
    space_ids: { type: 'keyword' },
    created_at: { type: 'date' },
    updated_at: { type: 'date' },
    created_by: {
      properties: {
        username: { type: 'keyword' },
        profile_uid: { type: 'keyword' },
        full_name: { type: 'keyword' },
        email: { type: 'keyword' },
      },
    },
    updated_by: {
      properties: {
        username: { type: 'keyword' },
        profile_uid: { type: 'keyword' },
        full_name: { type: 'keyword' },
        email: { type: 'keyword' },
      },
    },

    // --- Case fields (doc_type === 'case') ---
    title: {
      type: 'text',
      fields: { keyword: { type: 'keyword' } },
    },
    description: { type: 'text' },
    tags: { type: 'keyword' },
    category: { type: 'keyword' },
    status: { type: 'keyword' },
    status_sort: { type: 'short' },
    severity: { type: 'keyword' },
    severity_sort: { type: 'short' },
    created_at_ms: { type: 'long' },
    updated_at_ms: { type: 'long' },
    closed_at: { type: 'date' },
    closed_at_ms: { type: 'long' },
    closed_by: {
      properties: {
        username: { type: 'keyword' },
        profile_uid: { type: 'keyword' },
        full_name: { type: 'keyword' },
        email: { type: 'keyword' },
      },
    },
    assignees: { type: 'keyword' },
    total_assignees: { type: 'integer' },
    total_alerts: { type: 'integer' },
    total_comments: { type: 'integer' },
    time_to_resolve: { type: 'long' },
    time_to_acknowledge: { type: 'long' },
    time_to_investigate: { type: 'long' },
    custom_fields: {
      properties: {
        type: { type: 'keyword' },
        key: { type: 'keyword' },
        value: { type: 'keyword' },
      },
    },
    observables: {
      properties: {
        type: { type: 'keyword' },
        value: { type: 'keyword' },
      },
    },

    // --- Extended fields (doc_type === 'case' only) ---
    // dynamic: true scoped to this object; dynamic_templates at root control typing.
    extended_fields: {
      type: 'object',
      dynamic: true,
    },

    // --- Comment fields (doc_type === 'comment') ---
    comment: { type: 'text' },

    // --- Attachment fields (doc_type === 'attachment') ---
    type: { type: 'keyword' }, // attachment sub-type: 'alert' | 'externalReference'
    payload: {
      properties: {
        alerts: {
          properties: {
            id: { type: 'keyword' },
            index: { type: 'keyword' },
          },
        },
        file: {
          properties: {
            id: { type: 'keyword' },
            extension: { type: 'keyword' },
            mimeType: { type: 'keyword' },
            name: { type: 'keyword' },
          },
        },
      },
    },
  },
  dynamic_templates: [
    {
      ef_keyword: {
        path_match: 'extended_fields.*_as_keyword',
        mapping: { type: 'keyword' },
      },
    },
    {
      ef_text: {
        path_match: 'extended_fields.*_as_text',
        mapping: {
          type: 'text',
          fields: { keyword: { type: 'keyword', ignore_above: 256 } },
        },
      },
    },
    {
      ef_long: {
        path_match: 'extended_fields.*_as_long',
        mapping: { type: 'long' },
      },
    },
    {
      ef_double: {
        path_match: 'extended_fields.*_as_double',
        mapping: { type: 'double' },
      },
    },
    {
      ef_date: {
        path_match: 'extended_fields.*_as_date',
        mapping: { type: 'date' },
      },
    },
    {
      ef_boolean: {
        path_match: 'extended_fields.*_as_boolean',
        mapping: { type: 'boolean' },
      },
    },
    {
      ef_ip: {
        path_match: 'extended_fields.*_as_ip',
        mapping: { type: 'ip' },
      },
    },
    {
      ef_date_range: {
        path_match: 'extended_fields.*_as_date_range',
        mapping: { type: 'date_range' },
      },
    },
  ],
};
