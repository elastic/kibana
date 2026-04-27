/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { load as parseYaml } from 'js-yaml';
import { CASE_TEMPLATE_SAVED_OBJECT } from '../../../common/constants';
import type { Owner } from '../../../common/constants/types';
import type { ParsedTemplate, Template } from '../../../common/types/domain/template/v1';
import type { TemplateFieldRef } from './extended_fields_to_eval';

const PAGE_SIZE = 200;

/**
 * Loads every latest, non-deleted cases-templates SO for a given owner,
 * across all spaces, and returns the union of `(name, type)` field pairs
 * from each template's parsed YAML definition.
 *
 * The view sync service consumes this list to emit one EVAL per pair,
 * dispatched to the matching ES|QL TO_* function. Order is stable so
 * downstream view-query diffs are minimal.
 */
export const loadTemplateFieldsUnion = async (
  owner: Owner,
  savedObjectsClient: SavedObjectsClientContract,
  logger: Logger
): Promise<TemplateFieldRef[]> => {
  const seen = new Set<string>();
  const out: TemplateFieldRef[] = [];

  let page = 1;
  let total = Infinity;
  while ((page - 1) * PAGE_SIZE < total) {
    const response = await savedObjectsClient.find<Template>({
      type: CASE_TEMPLATE_SAVED_OBJECT,
      page,
      perPage: PAGE_SIZE,
      namespaces: ['*'],
      filter: `${CASE_TEMPLATE_SAVED_OBJECT}.attributes.isLatest: true AND ${CASE_TEMPLATE_SAVED_OBJECT}.attributes.owner: "${owner}"`,
    });
    total = response.total;

    for (const so of response.saved_objects) {
      // Soft-deleted templates are skipped: the deletedAt field is set
      // via the soft-delete flow and is checked in JS rather than via
      // the SO filter to keep the query simple and keyword-portable.
      if (so.attributes?.deletedAt) continue;
      const definition = so.attributes?.definition;
      if (typeof definition !== 'string' || definition.length === 0) continue;
      let parsed: ParsedTemplate['definition'];
      try {
        parsed = parseYaml(definition) as ParsedTemplate['definition'];
      } catch (err) {
        // A template with an invalid YAML body shouldn't break view generation
        // for every other template — log and skip it.
        logger.warn(
          `Skipping cases-templates ${so.id}: YAML parse failed (${
            err instanceof Error ? err.message : String(err)
          })`
        );
        continue;
      }

      const fields = parsed?.fields;
      if (!Array.isArray(fields)) {
        if (parsed != null) {
          logger.debug(
            `cases-templates ${so.id} parsed to a non-object or missing fields[] — skipping`
          );
        }
        continue;
      }
      for (const field of fields) {
        if (
          !field ||
          typeof field.name !== 'string' ||
          typeof field.type !== 'string'
        ) {
          continue;
        }
        const key = `${field.name}::${field.type}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ name: field.name, type: field.type });
      }
    }

    page += 1;
  }

  return out;
};
