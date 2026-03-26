/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { forwardRef, useMemo } from 'react';
import { css } from '@emotion/react';
import { EuiText } from '@elastic/eui';
import { useAgentSkills } from '../../../../../../../hooks/skills/use_agent_skills';
import { useAgentId } from '../../../../../../../hooks/use_conversation';
import type { CommandMenuComponentProps, CommandMenuHandle } from '../../types';
import { CommandId } from '../../types';
import { CommandMenuList } from '../components/command_menu_list';
import type { CommandMenuListOption } from '../components/command_menu_list';

const SKILLS_MENU_WIDTH = 350;

const descriptionStyles = css`
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  flex-shrink: 1;
  min-width: 0;
`;

export const Skills = forwardRef<CommandMenuHandle, CommandMenuComponentProps>(
  ({ query, onSelect }, ref) => {
    const agentId = useAgentId();
    const { skills, isLoading } = useAgentSkills({ agentId });

    const descriptionsByKey = useMemo(
      () => new Map(skills.map((skill) => [skill.id, skill.description])),
      [skills]
    );

    const options: CommandMenuListOption[] = useMemo(() => {
      const lowerQuery = query.toLowerCase();
      return skills
        .filter((skill) => skill.name.toLowerCase().includes(lowerQuery))
        .map((skill) => ({ key: skill.id, label: skill.name }));
    }, [skills, query]);

    return (
      <CommandMenuList
        ref={ref}
        options={options}
        isLoading={isLoading}
        onSelect={(option: CommandMenuListOption) => {
          onSelect({
            commandId: CommandId.Skill,
            label: option.label,
            id: option.key,
            metadata: {},
          });
        }}
        renderExtraContent={(key: string) => {
          const description = descriptionsByKey.get(key);
          if (!description) {
            return null;
          }
          return (
            <EuiText css={descriptionStyles} size="xs" color="subdued" component="span">
              {description}
            </EuiText>
          );
        }}
        width={SKILLS_MENU_WIDTH}
        data-test-subj="skillsMenu"
      />
    );
  }
);
