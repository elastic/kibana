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
 */
export type CaseViewSectionPosition = 'sidebar' | 'related' | 'closeModal';

export interface CaseViewSectionProps {
  caseData: CaseUI;
  /** The viewer can update the case (for actions such as linking). */
  canUpdate: boolean;
  /** Reloads the case, for example after a section added an attachment to it. */
  refreshCase: () => void;
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
  position: 'sidebar' | 'related';
  render: (props: CaseViewSectionProps) => ReactNode;
  /** For `related` sections: how many items the section adds to the Related tab's count. */
  getCount?: (caseData: CaseUI) => number;
};

export type CaseViewCloseModalSection = CaseViewSectionBase & {
  position: 'closeModal';
  render: (props: CaseViewCloseModalSectionProps) => ReactNode;
};

export type CaseViewSection = CaseViewPanelSection | CaseViewCloseModalSection;

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

  getVisible(position: 'sidebar' | 'related', caseData: CaseUI): CaseViewPanelSection[];
  getVisible(position: 'closeModal', caseData: CaseUI): CaseViewCloseModalSection[];
  getVisible(position: CaseViewSectionPosition, caseData: CaseUI): CaseViewSection[] {
    return [...this.sections.values()].filter(
      (section) => section.position === position && (section.isVisible?.(caseData) ?? true)
    );
  }
}

/** One registry per page load; the plugin's setup contract writes to it. */
export const caseViewSectionRegistry = new CaseViewSectionRegistry();
