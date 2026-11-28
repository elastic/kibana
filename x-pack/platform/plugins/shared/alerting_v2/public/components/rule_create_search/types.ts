/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';
import type { RULE_CREATE_SEARCH_SECTION_IDS } from './constants';

export type RuleCreateSearchSectionId = (typeof RULE_CREATE_SEARCH_SECTION_IDS)[number];

/** A single selectable result in the create rule search dropdown. */
export interface RuleCreateSearchItem {
  /** Unique within its section. */
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly iconType?: IconType;
  readonly onSelect: () => void;
}

/** Optional link rendered next to a section title (e.g. "Browse all"). */
export interface RuleCreateSearchSectionHeaderAction {
  readonly label: string;
  readonly onClick: () => void;
}

/** What a section hook returns for the current query. */
export interface RuleCreateSearchSectionResult {
  readonly items: readonly RuleCreateSearchItem[];
  readonly isLoading: boolean;
  /** When set, the section is hidden. */
  readonly error?: Error;
  readonly headerAction?: RuleCreateSearchSectionHeaderAction;
}

/** Section results keyed by id. Missing sections are not rendered. */
export type RuleCreateSearchSections = Partial<
  Readonly<Record<RuleCreateSearchSectionId, RuleCreateSearchSectionResult>>
>;
