/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BlastRadiusItemProps } from '@kbn/agentic-investigations-common';
import type { ProposalWithMetadata } from '../../../common';

type BlastRadiusItem = BlastRadiusItemProps['item'];

/**
 * Maps a `ProposalWithMetadata` to a list of {@link BlastRadiusItem} entries
 * for the `BlastRadiusSection` list variant.
 *
 * Rows, in order:
 * - One row per target entity (field:value format, split on the first `:`)
 * - Category (from action metadata when available, else proposal's own)
 * - Impact
 * - Reversibility (only when the action carries this flag)
 * - Decision deadline / expiry (only when `expiresAt` is set)
 */
export const toBlastRadiusItems = (proposal: ProposalWithMetadata): BlastRadiusItem[] => {
  const items: BlastRadiusItem[] = [];

  const category = proposal.action?.category ?? proposal.category;
  if (category) {
    items.push({
      id: 'category',
      iconType: 'tag',
      text: category,
    });
  }

  items.push({
    id: 'impact',
    iconType: 'warning',
    text: `${proposal.action?.impact ?? proposal.impact} impact`,
  });

  if (proposal.action?.reversible !== undefined) {
    items.push({
      id: 'reversible',
      iconType: 'editorUndo',
      text: proposal.action.reversible ? 'Reversible' : 'Not reversible',
      status: {
        label: proposal.action.reversible ? 'Yes' : 'No',
        iconType: proposal.action.reversible ? 'check' : 'cross',
        color: proposal.action.reversible ? 'success' : 'danger',
      },
    });
  }

  if (proposal.expiresAt) {
    const deadline = new Date(proposal.expiresAt);
    const label = proposal.expired
      ? 'Expired'
      : deadline.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    items.push({
      id: 'expires',
      iconType: 'clock',
      text: `Decision deadline: ${label}`,
    });
  }

  return items;
};
