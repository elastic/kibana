/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiContextMenu,
  EuiPopover,
  type EuiContextMenuPanelItemDescriptor,
} from '@elastic/eui';
import type { PublicSkillSummary } from '@kbn/agent-builder-common';
import { AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common/telemetry';
import React, { useCallback, useMemo, useState } from 'react';
import { useNavigation } from '../../hooks/use_navigation';
import { appPaths } from '../../utils/app_paths';
import { labels } from '../../utils/i18n';
import type { ContextMenuRowWithEbt } from '../context_menu_row_with_ebt';

interface SkillContextMenuProps {
  skill: PublicSkillSummary;
  onDelete: (skillId: string) => void;
  canManage: boolean;
}

export const SkillContextMenu: React.FC<SkillContextMenuProps> = ({
  skill,
  onDelete,
  canManage,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { navigateToAgentBuilderUrl } = useNavigation();

  const closePopover = useCallback(() => setIsOpen(false), []);
  const togglePopover = useCallback(() => setIsOpen((prev) => !prev), []);

  const panels = useMemo(() => {
    const items: ContextMenuRowWithEbt[] = [];

    if (skill.readonly) {
      items.push({
        name: labels.skills.viewSkillButtonLabel,
        icon: 'eye',
        onClick: () => {
          navigateToAgentBuilderUrl(appPaths.skills.details({ skillId: skill.id }));
          closePopover();
        },
        'data-test-subj': `agentBuilderSkillViewButton-${skill.id}`,
        'data-ebt-element': AGENT_BUILDER_UI_EBT.element.MANAGE_SKILLS_TABLE,
        'data-ebt-action': AGENT_BUILDER_UI_EBT.action.manageSkills.TABLE_CONTEXT_VIEW,
        'data-ebt-detail': AGENT_BUILDER_UI_EBT.entity.SKILL,
      });
    } else {
      items.push({
        name: labels.skills.editSkillButtonLabel,
        icon: 'pencil',
        onClick: () => {
          navigateToAgentBuilderUrl(appPaths.skills.details({ skillId: skill.id }));
          closePopover();
        },
        'data-test-subj': `agentBuilderSkillEditButton-${skill.id}`,
        'data-ebt-element': AGENT_BUILDER_UI_EBT.element.MANAGE_SKILLS_TABLE,
        'data-ebt-action': AGENT_BUILDER_UI_EBT.action.manageSkills.TABLE_CONTEXT_EDIT,
        'data-ebt-detail': AGENT_BUILDER_UI_EBT.entity.SKILL,
      });

      if (canManage) {
        items.push({
          name: labels.skills.deleteSkillButtonLabel,
          icon: 'trash',
          onClick: () => {
            onDelete(skill.id);
            closePopover();
          },
          'data-test-subj': `agentBuilderSkillDeleteButton-${skill.id}`,
          'data-ebt-element': AGENT_BUILDER_UI_EBT.element.MANAGE_SKILLS_TABLE,
          'data-ebt-action': AGENT_BUILDER_UI_EBT.action.manageSkills.TABLE_CONTEXT_DELETE,
          'data-ebt-detail': AGENT_BUILDER_UI_EBT.entity.SKILL,
        });
      }
    }

    // EUI `EuiContextMenuPanelItemDescriptor` omits `data-ebt-*` from typings; EUI forwards them to the item control at runtime.
    return [{ id: 0, items: items as unknown as EuiContextMenuPanelItemDescriptor[] }];
  }, [skill, canManage, navigateToAgentBuilderUrl, closePopover, onDelete]);

  return (
    <EuiPopover
      button={
        <EuiButtonIcon
          iconType="boxesHorizontal"
          aria-label={labels.skills.skillContextMenuButtonLabel}
          onClick={togglePopover}
          data-test-subj={`agentBuilderSkillContextMenuButton-${skill.id}`}
          data-ebt-element={AGENT_BUILDER_UI_EBT.element.MANAGE_SKILLS_TABLE}
          data-ebt-action={AGENT_BUILDER_UI_EBT.action.manageSkills.TABLE_CONTEXT_OPEN}
          data-ebt-detail={AGENT_BUILDER_UI_EBT.entity.SKILL}
        />
      }
      isOpen={isOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="downRight"
    >
      <EuiContextMenu initialPanelId={0} panels={panels} size="s" />
    </EuiPopover>
  );
};
