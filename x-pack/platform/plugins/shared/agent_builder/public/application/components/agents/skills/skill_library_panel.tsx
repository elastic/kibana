/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { PublicSkillSummary } from '@kbn/agent-builder-common';
import { labels } from '../../../utils/i18n';
import { appPaths } from '../../../utils/app_paths';
import { LibraryPanel } from '../common/library_panel';
import type { LibraryPanelLabels } from '../common/library_panel';

const libraryLabels: LibraryPanelLabels = {
  title: labels.agentSkills.addSkillFromLibraryTitle,
  manageLibraryLink: labels.agentSkills.manageSkillLibraryLink,
  searchPlaceholder: labels.agentSkills.searchAvailableSkillsPlaceholder,
  availableSummary: labels.agentSkills.availableSkillsSummary,
  noMatchMessage: labels.agentSkills.noAvailableSkillsMatchMessage,
  noItemsMessage: labels.agentSkills.noAvailableSkillsMessage,
  disabledBadgeLabel: labels.agentSkills.autoIncludedBadgeLabel,
  disabledTooltipTitle: labels.agentSkills.autoIncludedTooltipTitle,
  disabledTooltipBody: labels.agentSkills.autoIncludedTooltipBody,
};

const getSkillName = (skill: PublicSkillSummary): string => skill.name;

interface SkillLibraryPanelProps {
  onClose: () => void;
  allSkills: PublicSkillSummary[];
  activeSkillIdSet: Set<string>;
  onToggleSkill: (skill: PublicSkillSummary, isActive: boolean) => void;
  mutatingSkillId: string | null;
  enableElasticCapabilities?: boolean;
  builtinSkillIdSet?: Set<string>;
}

export const SkillLibraryPanel: React.FC<SkillLibraryPanelProps> = ({
  onClose,
  allSkills,
  activeSkillIdSet,
  onToggleSkill,
  mutatingSkillId,
  enableElasticCapabilities = false,
  builtinSkillIdSet,
}) => {
  const disabledItemIdSet = useMemo(() => {
    if (!enableElasticCapabilities || !builtinSkillIdSet) return undefined;
    return builtinSkillIdSet;
  }, [enableElasticCapabilities, builtinSkillIdSet]);

  return (
    <LibraryPanel<PublicSkillSummary>
      onClose={onClose}
      allItems={allSkills}
      activeItemIdSet={activeSkillIdSet}
      onToggleItem={onToggleSkill}
      mutatingItemId={mutatingSkillId}
      flyoutTitleId="skillLibraryFlyoutTitle"
      libraryLabels={libraryLabels}
      manageLibraryPath={appPaths.manage.skills}
      getItemName={getSkillName}
      disabledItemIdSet={disabledItemIdSet}
    />
  );
};
