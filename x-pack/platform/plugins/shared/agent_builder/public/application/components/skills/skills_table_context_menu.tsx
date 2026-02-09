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
} from '@elastic/eui';
import type { PublicSkillDefinition } from '@kbn/agent-builder-common';
import React, { useCallback, useMemo, useState } from 'react';
import { useNavigation } from '../../hooks/use_navigation';
import { appPaths } from '../../utils/app_paths';
import { labels } from '../../utils/i18n';

interface SkillContextMenuProps {
  skill: PublicSkillDefinition;
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
    const items = [];

    if (skill.readonly) {
      items.push({
        name: labels.skills.viewSkillButtonLabel,
        icon: 'eye',
        onClick: () => {
          navigateToAgentBuilderUrl(appPaths.skills.details({ skillId: skill.id }));
          closePopover();
        },
        'data-test-subj': `agentBuilderSkillViewButton-${skill.id}`,
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
        });
      }
    }

    return [{ id: 0, items }];
  }, [skill, canManage, navigateToAgentBuilderUrl, closePopover, onDelete]);

  return (
    <EuiPopover
      button={
        <EuiButtonIcon
          iconType="boxesHorizontal"
          aria-label={labels.skills.skillContextMenuButtonLabel}
          onClick={togglePopover}
          data-test-subj={`agentBuilderSkillContextMenuButton-${skill.id}`}
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
