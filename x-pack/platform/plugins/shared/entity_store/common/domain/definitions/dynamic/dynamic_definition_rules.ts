/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import type { z } from '@kbn/zod/v4';
import type { Condition } from '@kbn/streamlang';
import { isLiteralFieldPath } from './dynamic_block_schema';
import { isNotEmptyCondition } from '../common_fields';
import type {
  CalculatedEntityIdentity,
  EntityDefinitionWithoutId,
  EntityIdentity,
  EuidRanking,
} from '../entity_schema';

/** Name of the rule that an attribute of a `dynamic` source may not read an identity field. */
export const NO_IDENTITY_ATTRIBUTE_RULE = 'attributes are not identity fields';
/** Name of the rule restricting `identityField` to what the inventory can group by. */
export const SERVABLE_IDENTITY_RULE = 'servable identity';

/** Column the inventory writes the last-seen timestamp to, so no identity field may take its name. */
export const RESERVED_LAST_SEEN_FIELD = 'last_seen';

/** Most distinct identity fields a definition with `dynamic` may group by. */
export const MAX_DYNAMIC_IDENTITY_FIELDS = 8;

type DefinitionWithDynamic = Pick<EntityDefinitionWithoutId, 'identityField' | 'dynamic'>;

const rankingCompositionFields = (ranking: EuidRanking): string[][] =>
  ranking.branches.flatMap((branch) =>
    branch.ranking.map((composition) =>
      composition.flatMap((part) => ('field' in part ? [part.field] : []))
    )
  );

/** Every field an identity reads: the single field, or every field of every ranking composition. */
export const getIdentityFields = (identityField: EntityIdentity): string[] =>
  'singleField' in identityField
    ? [identityField.singleField]
    : [...new Set(rankingCompositionFields(identityField.euidRanking).flat())];

const compositionPresenceFilter = (fields: readonly string[]): Condition =>
  fields.length === 1
    ? isNotEmptyCondition(fields[0])
    : { and: fields.map((field) => isNotEmptyCondition(field)) };

/**
 * The `documentsFilter` a servable ranking must carry: every field of a composition present and
 * non-empty, for any of its compositions. The built-in `host` declares exactly this filter.
 */
export const getPresenceFilter = (compositions: ReadonlyArray<readonly string[]>): Condition =>
  compositions.length === 1
    ? compositionPresenceFilter(compositions[0])
    : { or: compositions.map(compositionPresenceFilter) };

const literalFieldMessage = (field: string): string =>
  `${SERVABLE_IDENTITY_RULE}: "${field}" must be a literal field path (no wildcards, expressions, quoting or whitespace), the inventory groups on raw mapped fields`;

const reservedFieldMessage = `${SERVABLE_IDENTITY_RULE}: "${RESERVED_LAST_SEEN_FIELD}" is the inventory's own output column and cannot be an identity field`;

const checkCalculatedIdentity = (
  identityField: CalculatedEntityIdentity,
  addIssue: (path: PropertyKey[], message: string) => void
): void => {
  const { euidRanking, fieldEvaluations, documentsFilter } = identityField;
  if (fieldEvaluations !== undefined && fieldEvaluations.length > 0) {
    addIssue(
      ['identityField', 'fieldEvaluations'],
      `${SERVABLE_IDENTITY_RULE}: the inventory never computes ids per document; remove fieldEvaluations`
    );
  }

  // The presence filter is only defined for one unconditional branch of literal fields.
  let rankingIsServable = true;
  if (euidRanking.branches.length !== 1) {
    rankingIsServable = false;
    addIssue(
      ['identityField', 'euidRanking', 'branches'],
      `${SERVABLE_IDENTITY_RULE}: the inventory serves exactly one ranking branch, got ${euidRanking.branches.length}`
    );
  }
  euidRanking.branches.forEach((branch, branchIndex) => {
    const branchPath = ['identityField', 'euidRanking', 'branches', branchIndex];
    if (branch.when !== undefined) {
      rankingIsServable = false;
      addIssue(
        [...branchPath, 'when'],
        `${SERVABLE_IDENTITY_RULE}: the inventory serves one unconditional ranking branch; remove when`
      );
    }
    branch.ranking.forEach((composition, compositionIndex) => {
      composition.forEach((part, partIndex) => {
        if (!('field' in part)) {
          return;
        }
        const fieldPath = [...branchPath, 'ranking', compositionIndex, partIndex, 'field'];
        if (!isLiteralFieldPath(part.field)) {
          rankingIsServable = false;
          addIssue(fieldPath, literalFieldMessage(part.field));
        }
        if (part.field === RESERVED_LAST_SEEN_FIELD) {
          addIssue(fieldPath, reservedFieldMessage);
        }
      });
    });
  });

  const fieldCount = getIdentityFields(identityField).length;
  if (fieldCount > MAX_DYNAMIC_IDENTITY_FIELDS) {
    addIssue(
      ['identityField', 'euidRanking'],
      `${SERVABLE_IDENTITY_RULE}: at most ${MAX_DYNAMIC_IDENTITY_FIELDS} distinct identity fields, got ${fieldCount}`
    );
  }

  if (!rankingIsServable) {
    return;
  }
  const expected = getPresenceFilter(rankingCompositionFields(euidRanking));
  if (!isEqual(documentsFilter, expected)) {
    addIssue(
      ['identityField', 'documentsFilter'],
      `${SERVABLE_IDENTITY_RULE}: documentsFilter must be exactly the presence filter of the ranking (every field of a composition present and non-empty, for any composition, in ranking order); expected ${JSON.stringify(
        expected
      )}`
    );
  }
};

/**
 * Whole-definition rules for a definition carrying `dynamic`: its identity must be servable as
 * ES|QL `BY` keys, and no attribute may read an identity field. A definition without `dynamic` is
 * never checked.
 */
export const assertDynamicDefinitionRules = (
  definition: DefinitionWithDynamic,
  ctx: z.RefinementCtx
): void => {
  const { identityField, dynamic } = definition;
  if (!dynamic) {
    return;
  }
  const addIssue = (path: PropertyKey[], message: string): void => {
    ctx.addIssue({ code: 'custom', path, message });
  };

  if (identityField.skipTypePrepend === true) {
    addIssue(
      ['identityField', 'skipTypePrepend'],
      `${SERVABLE_IDENTITY_RULE}: entity ids keep the type prefix; remove skipTypePrepend`
    );
  }
  if ('singleField' in identityField) {
    if (!isLiteralFieldPath(identityField.singleField)) {
      addIssue(['identityField', 'singleField'], literalFieldMessage(identityField.singleField));
    }
    if (identityField.singleField === RESERVED_LAST_SEEN_FIELD) {
      addIssue(['identityField', 'singleField'], reservedFieldMessage);
    }
  } else {
    checkCalculatedIdentity(identityField, addIssue);
  }

  const identityFields = new Set(getIdentityFields(identityField));
  dynamic.sources.forEach((source, sourceIndex) => {
    (source.attributes ?? []).forEach(({ field }, attributeIndex) => {
      if (identityFields.has(field)) {
        addIssue(
          ['dynamic', 'sources', sourceIndex, 'attributes', attributeIndex, 'field'],
          `${NO_IDENTITY_ATTRIBUTE_RULE}: "${field}" is an identity field; every row already carries it`
        );
      }
    });
  });
};
