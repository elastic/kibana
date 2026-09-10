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
  let idCounter = 0;
  const nextId = (prefix: string) => `${prefix}-${idCounter++}`;

  // Target entities — split on the first `:` only so IPv6 addresses
  // like `host.ip:2001:db8::1` render as `field: 2001:db8::1`.
  const entities: string[] = [];
  for (const entity of entities) {
    const colonIdx = entity.indexOf(':');
    const field = colonIdx === -1 ? entity : entity.slice(0, colonIdx);
    const value = colonIdx === -1 ? '' : entity.slice(colonIdx + 1);
    items.push({
      id: nextId('entity'),
      iconType: 'globe',
      // React.ReactNode accepts plain strings; no JSX needed here.
      text: value ? `${field}: ${value}` : field,
    });
  }

  // Category
  const category = proposal.action?.category ?? proposal.category;
  if (category) {
    items.push({
      id: nextId('category'),
      iconType: 'tag',
      text: category,
    });
  }

  // Impact
  items.push({
    id: nextId('impact'),
    iconType: 'warning',
    text: `${proposal.action?.impact ?? proposal.impact} impact`,
  });

  // Reversibility — only shown when the action flag is explicitly set
  if (proposal.action?.reversible !== undefined) {
    items.push({
      id: nextId('reversible'),
      iconType: 'editorUndo',
      text: proposal.action.reversible ? 'Reversible' : 'Not reversible',
      status: {
        label: proposal.action.reversible ? 'Yes' : 'No',
        iconType: proposal.action.reversible ? 'check' : 'cross',
        // Avoid 'warning' — blast_radius_item renders a warning icon but success-colored text.
        color: proposal.action.reversible ? ('success' as const) : ('danger' as const),
      },
    });
  }

  // Decision deadline
  if (proposal.expiresAt) {
    const deadline = new Date(proposal.expiresAt);
    const label = proposal.expired
      ? 'Expired'
      : deadline.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    items.push({
      id: nextId('expires'),
      iconType: 'clock',
      text: `Decision deadline: ${label}`,
    });
  }

  return items;
};
