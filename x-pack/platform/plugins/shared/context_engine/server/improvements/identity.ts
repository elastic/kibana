/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { ImprovementAction } from '../../common/http_api/improvement_actions';
import type { ImprovementTarget } from '../../common/http_api/improvements';
import { isAddAction } from '../../common/http_api/improvements';
import { InvalidImprovementError } from './errors';

/** 128 bits of SHA-256, hex-encoded: short enough to read in a URL, wide enough not to collide. */
const IMPROVEMENT_ID_LENGTH = 32;

/**
 * The discriminator that identifies the proposed fix, per action.
 *
 * Deliberately excludes all free text. A PoC folded the normalized `title` into the fingerprint
 * and, because the agent rewords titles between runs, one latent problem produced a stream of
 * near-duplicate improvements.
 */
const DISCRIMINATOR_BY_ACTION: Record<ImprovementAction, keyof ImprovementTarget> = {
  add_ki: 'subject',
  edit_ki: 'ki_id',
  remove_ki: 'ki_id',
  add_workflow: 'subject',
  edit_workflow: 'workflow_id',
  remove_workflow: 'workflow_id',
  add_source: 'subject',
  edit_source: 'source_value',
  remove_source: 'source_value',
};

/**
 * The stable identity of a proposed fix, e.g. `remove_workflow:<workflow_id>`. Describes the fix
 * itself, never the signals behind it, so a re-run over the same latent problem appends a revision
 * to one improvement rather than creating a duplicate row.
 */
export const buildChangeFingerprint = ({
  action,
  target,
}: {
  action: ImprovementAction;
  target?: ImprovementTarget;
}): string => {
  const field = DISCRIMINATOR_BY_ACTION[action];
  if (!field) {
    throw new InvalidImprovementError(`Unknown improvement action '${action}'`);
  }

  const value = target?.[field];
  if (!value) {
    throw new InvalidImprovementError(
      isAddAction(action)
        ? `Improvement action '${action}' requires 'target.subject' to identify what the addition is about`
        : `Improvement action '${action}' requires 'target.${field}'`
    );
  }

  return `${action}:${value}`;
};

/**
 * Idempotent lineage key: `hash(ai_index_id + change_fingerprint)`. Two runs proposing the same
 * fix for the same AI index produce the same `improvement_id`, and therefore two revisions of one
 * improvement rather than two improvements.
 */
export const buildImprovementId = ({
  aiIndexId,
  action,
  target,
}: {
  aiIndexId: string;
  action: ImprovementAction;
  target?: ImprovementTarget;
}): string =>
  createHash('sha256')
    .update(`${aiIndexId}\u0000${buildChangeFingerprint({ action, target })}`)
    .digest('hex')
    .slice(0, IMPROVEMENT_ID_LENGTH);
