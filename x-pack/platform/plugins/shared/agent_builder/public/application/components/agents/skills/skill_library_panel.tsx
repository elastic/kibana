/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { PublicSkillSummary } from '@kbn/agent-builder-common';
import { labels } from '../../../utils/i18n';
import { appPaths } from '../../../utils/app_paths';
import { LibraryPanel } from '../common/library_panel';
import type { LibraryPanelLabels } from '../common/library_panel';

const libraryLabels: LibraryPanelLabels = {
  title: labels.agentSkills.addSkillFromLibraryTitle,
  manageLibraryLink: labels.agentSkills.manageSkillLibraryLink,
  searchPlaceholder: labels.agentSkills.searchAvailableSkillsPlaceholder,
  availableSummary: (showing, total) => (
    <FormattedMessage
      id="xpack.agentBuilder.agentSkills.availableSkillsSummary"
      defaultMessage="Showing <bold>1-{showing}</bold> of {total} <bold>{total, plural, one {Skill} other {Skills}}</bold>"
      values={{
        showing,
        total,
        bold: (chunks) => <strong>{chunks}</strong>,
      }}
    />
  ),
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
  enableElasticCapabilities?: boolean;
  builtinSkillIdSet?: Set<string>;
}

export const SkillLibraryPanel: React.FC<SkillLibraryPanelProps> = ({
  onClose,
  allSkills,
  activeSkillIdSet,
  onToggleSkill,
  enableElasticCapabilities = false,
  builtinSkillIdSet,
}) => {
  const disabledItemIdSet = useMemo(() => {
    if (!enableElasticCapabilities || !builtinSkillIdSet) return undefined;
    return builtinSkillIdSet;
  }, [enableElasticCapabilities, builtinSkillIdSet]);
  const readOnlyItemIdSet = useMemo(
    () => new Set(allSkills.filter((s) => s.readonly).map((s) => s.id)),
    [allSkills]
  );

  return (
    <LibraryPanel<PublicSkillSummary>
      onClose={onClose}
      allItems={allSkills}
      activeItemIdSet={activeSkillIdSet}
      onToggleItem={onToggleSkill}
      mutatingItemId={null}
      flyoutTitleId="skillLibraryFlyoutTitle"
      libraryLabels={libraryLabels}
      manageLibraryPath={appPaths.manage.skills}
      getItemName={getSkillName}
      disabledItemIdSet={disabledItemIdSet}
      readOnlyItemIdSet={readOnlyItemIdSet}
    />
  );
};
