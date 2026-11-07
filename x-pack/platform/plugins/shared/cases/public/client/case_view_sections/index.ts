/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import type { CaseUI } from '../../../common/ui/types';

/**
 * Where a registered section renders on the case view.
 * - `sidebar`: inside the sidebar's Verdict section, under the verdicts.
 * - `related`: at the top of the Related tab, above the similar cases.
 * - `closeModal`: in the close modal, for side effects of closing (one case at a time).
 * - `aboveTabs`: between the header and the tabs, only for something on the case that needs action.
 * - `tab`: a tab of its own, after Cases' tabs.
 * - `impact`: not rendered; hosts and users it reports join the case's Scope panel as impacted.
 */
export type CaseViewSectionPosition =
  | 'sidebar'
  | 'related'
  | 'closeModal'
  | 'aboveTabs'
  | 'tab'
  | 'impact';

/** Why something is related to a case. Each Related section computes the reasons it can. */
export type RelatedByReason =
  | 'linked'
  | 'observable'
  | 'alert'
  | 'event'
  | 'dashboard'
  | 'aiVerdict';

/**
 * The Related tab's filters. Cases owns the toolbar; each `related` section applies the filters to
 * its own rows. An empty list means "no filter".
 */
export interface RelatedFilters {
  relatedBy: RelatedByReason[];
  status: Array<'open' | 'closed'>;
}

export const EMPTY_RELATED_FILTERS: RelatedFilters = { relatedBy: [], status: [] };

export const isRelatedFilterActive = (filters?: RelatedFilters): boolean =>
  Boolean(filters && (filters.relatedBy.length > 0 || filters.status.length > 0));

/** True when a row with these reasons and this open or closed state passes the filters. */
export const matchesRelatedFilters = (
  row: { reasons: RelatedByReason[]; isClosed: boolean },
  filters?: RelatedFilters
): boolean => {
  if (!filters) return true;
  if (
    filters.relatedBy.length > 0 &&
    !row.reasons.some((reason) => filters.relatedBy.includes(reason))
  ) {
    return false;
  }
  if (filters.status.length > 0 && !filters.status.includes(row.isClosed ? 'closed' : 'open')) {
    return false;
  }
  return true;
};

export interface CaseViewSectionProps {
  caseData: CaseUI;
  /** Present on the Related tab: the active Related by and Status filters. */
  relatedFilters?: RelatedFilters;
  /** The viewer can update the case (for actions such as linking). */
  canUpdate: boolean;
  /** Reloads the case, for example after a section added an attachment to it. */
  refreshCase: () => void;
  /** Switches the case view to a tab, Cases' own or a registered `tab` section's `tabId`. */
  openTab?: (tabId: string) => void;
}

export interface CaseViewCloseModalSectionProps extends CaseViewSectionProps {
  /** Whether the case's linked investigations close with it (sent as `closeLinkedInvestigations`). */
  closeLinkedInvestigations: boolean;
  setCloseLinkedInvestigations: (value: boolean) => void;
}

interface CaseViewSectionBase {
  /** Unique across all plugins; also the React key. */
  id: string;
  /** Hidden when this returns false. Defaults to always visible. */
  isVisible?: (caseData: CaseUI) => boolean;
}

export type CaseViewPanelSection = CaseViewSectionBase & {
  position: 'sidebar' | 'related' | 'aboveTabs';
  render: (props: CaseViewSectionProps) => ReactNode;
  /** For `related` sections: how many items the section adds to the Related tab's count. */
  getCount?: (caseData: CaseUI) => number;
};

export type CaseViewCloseModalSection = CaseViewSectionBase & {
  position: 'closeModal';
  render: (props: CaseViewCloseModalSectionProps) => ReactNode;
};

export type CaseViewTabSection = CaseViewSectionBase & {
  position: 'tab';
  /** The tab's `tabId` in the URL. Must not collide with Cases' own tab ids. */
  tabId: string;
  name: string;
  /** The count in the tab's badge. No badge when it returns 0 or undefined. */
  getBadgeCount?: (caseData: CaseUI) => number | undefined;
  render: (props: CaseViewSectionProps) => ReactNode;
};

/** A host or user something reports as affected by what the case is about. */
export interface CaseImpactedEntity {
  type: 'host' | 'user' | 'other';
  name: string;
}

export type CaseViewImpactSource = CaseViewSectionBase & {
  position: 'impact';
  getEntities: (caseData: CaseUI) => CaseImpactedEntity[];
};

export type CaseViewSection =
  | CaseViewPanelSection
  | CaseViewCloseModalSection
  | CaseViewTabSection
  | CaseViewImpactSource;

/**
 * Lets another plugin add a section to the case view without Cases knowing what it shows. The
 * sections render inside the Cases app, so they bring their own providers.
 */
export class CaseViewSectionRegistry {
  private readonly sections = new Map<string, CaseViewSection>();

  register(section: CaseViewSection): void {
    if (this.sections.has(section.id)) {
      throw new Error(`Case view section "${section.id}" is already registered`);
    }
    this.sections.set(section.id, section);
  }

  getVisible(
    position: 'sidebar' | 'related' | 'aboveTabs',
    caseData: CaseUI
  ): CaseViewPanelSection[];
  getVisible(position: 'closeModal', caseData: CaseUI): CaseViewCloseModalSection[];
  getVisible(position: 'tab', caseData: CaseUI): CaseViewTabSection[];
  getVisible(position: 'impact', caseData: CaseUI): CaseViewImpactSource[];
  getVisible(position: CaseViewSectionPosition, caseData: CaseUI): CaseViewSection[] {
    return [...this.sections.values()].filter(
      (section) => section.position === position && (section.isVisible?.(caseData) ?? true)
    );
  }
}

/** One registry per page load; the plugin's setup contract writes to it. */
export const caseViewSectionRegistry = new CaseViewSectionRegistry();

export { decisionsAvailability } from './decisions_availability';
