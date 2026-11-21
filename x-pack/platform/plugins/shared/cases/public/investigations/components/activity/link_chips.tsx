/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { ActivityLink } from '../../../../common/investigations/types';
import { ICONS } from '../../icons';
import { isTabId } from '../tabs/tab_props';
import type { TabId, TabProps } from '../tabs/tab_props';
import * as i18n from './translations';

const TAB_LABELS: Record<TabId, string> = {
  overview: i18n.TAB_OVERVIEW,
  conversation: i18n.TAB_CONVERSATION,
  evidence: i18n.TAB_EVIDENCE,
  scope: i18n.TAB_SCOPE,
  procedure: i18n.TAB_PROCEDURE,
  activity: i18n.TAB_ACTIVITY,
};

interface ChipSpec {
  label: string;
  iconType: string;
  navigate: () => void;
}

type Navigate = TabProps['onNavigateTab'];

const itemChip =
  (tab: TabId, iconType: string, getLabel: (label: string | null | undefined) => string) =>
  (link: ActivityLink, navigate: Navigate): ChipSpec | null => {
    const itemId = link.id ?? undefined;
    return itemId
      ? { label: getLabel(link.label), iconType, navigate: () => navigate(tab, { itemId }) }
      : null;
  };

const optionalItemChip =
  (tab: TabId, iconType: string, fallbackLabel: string) =>
  (link: ActivityLink, navigate: Navigate): ChipSpec => {
    const itemId = link.id ?? undefined;
    return {
      label: link.label ?? fallbackLabel,
      iconType,
      navigate: () => navigate(tab, itemId ? { itemId } : undefined),
    };
  };

const CHIP_BUILDERS: Partial<
  Record<ActivityLink['kind'], (link: ActivityLink, navigate: Navigate) => ChipSpec | null>
> = {
  evidence: itemChip('evidence', ICONS.evidence, (label) => label ?? i18n.TAB_EVIDENCE),
  claim: itemChip('overview', ICONS.claim, (label) => i18n.LINK_CLAIM(label ?? '')),
  proposal: itemChip('overview', ICONS.proposal, (label) => i18n.LINK_PROPOSAL(label ?? '')),
  task: itemChip('procedure', ICONS.procedure, (label) =>
    label ? `${i18n.LINK_TASK} ${label}` : i18n.LINK_TASK
  ),
  entity: itemChip('scope', ICONS.graphNode, (label) => label ?? i18n.LINK_ENTITY),
  link: itemChip('scope', ICONS.link, (label) =>
    label && label.length > 0 ? label : i18n.LINK_LINK
  ),
  thread: optionalItemChip('conversation', ICONS.thread, i18n.LINK_THREAD),
  verdict: optionalItemChip('overview', ICONS.verdict, i18n.LINK_VERDICT),
  tab: (link, navigate) => {
    const target = link.id;
    return target && isTabId(target)
      ? {
          label: link.label ?? TAB_LABELS[target],
          iconType: ICONS.chevronRight,
          navigate: () => navigate(target),
        }
      : null;
  },
};

/** What a link chip shows and where it goes, or null when the link has nowhere to go. */
export const getLinkChip = (link: ActivityLink, onNavigateTab: Navigate): ChipSpec | null =>
  CHIP_BUILDERS[link.kind]?.(link, onNavigateTab) ?? null;

export interface LinkChipsProps {
  links: readonly ActivityLink[];
  onNavigateTab: TabProps['onNavigateTab'];
}

export const LinkChips: React.FC<LinkChipsProps> = ({ links, onNavigateTab }) => {
  const chips = links
    .map((link, index) => ({
      key: `${link.kind}-${link.id ?? index}-${index}`,
      spec: getLinkChip(link, onNavigateTab),
      kind: link.kind,
    }))
    .filter(
      (chip): chip is { key: string; spec: ChipSpec; kind: ActivityLink['kind'] } =>
        chip.spec !== null
    );

  if (chips.length === 0) {
    return null;
  }

  return (
    <EuiFlexGroup
      gutterSize="xs"
      wrap
      responsive={false}
      data-test-subj="investigationActivityLinks"
    >
      {chips.map(({ key, spec, kind }) => (
        <EuiFlexItem grow={false} key={key}>
          <EuiBadge
            color="hollow"
            iconType={spec.iconType}
            onClick={spec.navigate}
            onClickAriaLabel={i18n.LINK_OPEN(spec.label)}
            data-test-subj={`investigationActivityLink-${kind}`}
          >
            {spec.label}
          </EuiBadge>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
LinkChips.displayName = 'LinkChips';
