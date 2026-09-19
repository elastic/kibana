/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { BlastRadiusItemProps } from '@kbn/agentic-investigations-common';
import type { ProposalWithMetadata } from '../../../common';

type BlastRadiusItem = BlastRadiusItemProps['item'];

/**
 * Maps a `ProposalWithMetadata` to a list of {@link BlastRadiusItem} entries
 * for the `BlastRadiusSection` list variant.
 *
 * Rows, in order:
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
    text: i18n.translate('xpack.agenticInvestigations.proposals.blastRadius.impactText', {
      defaultMessage: '{impact} impact',
      // The proposal's own impact first: a revision can override it.
      values: { impact: proposal.impact ?? proposal.action?.impact },
    }),
  });

  if (proposal.action?.reversible !== undefined) {
    items.push({
      id: 'reversible',
      iconType: 'editorUndo',
      text: proposal.action.reversible
        ? i18n.translate('xpack.agenticInvestigations.proposals.blastRadius.reversibleText', {
            defaultMessage: 'Reversible',
          })
        : i18n.translate('xpack.agenticInvestigations.proposals.blastRadius.notReversibleText', {
            defaultMessage: 'Not reversible',
          }),
      status: {
        label: proposal.action.reversible
          ? i18n.translate('xpack.agenticInvestigations.proposals.blastRadius.reversibleYes', {
              defaultMessage: 'Yes',
            })
          : i18n.translate('xpack.agenticInvestigations.proposals.blastRadius.reversibleNo', {
              defaultMessage: 'No',
            }),
        iconType: proposal.action.reversible ? 'check' : 'cross',
        color: proposal.action.reversible ? 'success' : 'danger',
      },
    });
  }

  if (proposal.expiresAt) {
    const deadline = new Date(proposal.expiresAt);
    const label = proposal.expired
      ? i18n.translate('xpack.agenticInvestigations.proposals.blastRadius.expiredLabel', {
          defaultMessage: 'Expired',
        })
      : deadline.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    items.push({
      id: 'expires',
      iconType: 'clock',
      text: i18n.translate(
        'xpack.agenticInvestigations.proposals.blastRadius.decisionDeadlineText',
        { defaultMessage: 'Decision deadline: {label}', values: { label } }
      ),
    });
  }

  return items;
};
