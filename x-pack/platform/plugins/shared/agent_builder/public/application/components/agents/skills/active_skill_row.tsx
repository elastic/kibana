/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import type { PublicSkillSummary } from '@kbn/agent-builder-common';
import {
  AGENT_BUILDER_UI_EBT_ELEMENT,
  AGENT_BUILDER_UI_EBT_LAYER2_CRUD_ACTION,
} from '../../../agent_builder_ui_ebt';
import { labels } from '../../../utils/i18n';
import { ActiveItemRow } from '../common/active_item_row';

export interface ActiveSkillRowProps {
  skill: PublicSkillSummary;
  isSelected: boolean;
  onSelect: (skill: PublicSkillSummary) => void;
  onRemove: (skill: PublicSkillSummary) => void;
  isRemoving?: boolean;
  isAutoIncluded: boolean;
  canEditAgent: boolean;
}

export const ActiveSkillRow: React.FC<ActiveSkillRowProps> = ({
  skill,
  isSelected,
  onSelect,
  onRemove,
  isRemoving = false,
  isAutoIncluded,
  canEditAgent,
}) => {
  return (
    <ActiveItemRow
      id={skill.id}
      name={skill.name}
      isSelected={isSelected}
      onSelect={() => onSelect(skill)}
      onRemove={() => onRemove(skill)}
      isRemoving={isRemoving}
      removeAriaLabel={labels.agentSkills.removeSkillAriaLabel}
      canEditAgent={canEditAgent}
      readOnlyContent={
        isAutoIncluded ? (
          <EuiBadge color="hollow">{labels.agentSkills.elasticCapabilitiesReadOnlyBadge}</EuiBadge>
        ) : undefined
      }
      removeDataEbtElement={AGENT_BUILDER_UI_EBT_ELEMENT.CUSTOMIZE_SKILLS}
      removeDataEbtAction={AGENT_BUILDER_UI_EBT_LAYER2_CRUD_ACTION.ENTITY_REMOVE}
      removeDataEbtDetail={skill.id}
    />
  );
};
