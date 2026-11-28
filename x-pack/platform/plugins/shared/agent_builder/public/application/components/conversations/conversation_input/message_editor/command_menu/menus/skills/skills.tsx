/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { forwardRef, useEffect, useMemo } from 'react';
import { css } from '@emotion/react';
import { EuiText, useEuiTheme } from '@elastic/eui';
import { useAgentSkills } from '../../../../../../../hooks/skills/use_agent_skills';
import { useAgentId } from '../../../../../../../hooks/use_conversation';
import { useSlashCommands } from '../../../../slash_commands/use_slash_commands';
import type { CommandMenuComponentProps, CommandMenuHandle } from '../../types';
import { CommandId } from '../../types';
import { CommandMenuList } from '../components/command_menu_list';
import type { CommandMenuListOption } from '../components/command_menu_list';

const SKILLS_MENU_WIDTH = 350;

const SLASH_COMMAND_KEY_PREFIX = 'slashCommand:';

const descriptionStyles = css`
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  flex-shrink: 1;
  min-width: 0;
`;

export const Skills = forwardRef<CommandMenuHandle, CommandMenuComponentProps>(
  ({ query, onSelect, onReplaceText, onContentChange }, ref) => {
    const { euiTheme } = useEuiTheme();
    const agentId = useAgentId();
    const { skills, isLoading } = useAgentSkills({ agentId });
    const slashCommands = useSlashCommands();

    const skillRowStyles = useMemo(
      () => css`
        display: flex;
        align-items: baseline;
        gap: ${euiTheme.size.s};
        min-width: 0;
      `,
      [euiTheme.size.s]
    );

    const availableCommands = useMemo(
      () => slashCommands.filter(({ unavailableReason }) => !unavailableReason),
      [slashCommands]
    );

    // Once a command name is followed by a space the user is typing its arguments, and Enter
    // must submit rather than pick a skill that happens to share the prefix.
    const isTypingCommandArgs = useMemo(() => {
      const lowerQuery = query.toLowerCase();
      return availableCommands.some(({ name }) => lowerQuery.startsWith(`${name} `));
    }, [availableCommands, query]);

    const options: CommandMenuListOption[] = useMemo(() => {
      if (isTypingCommandArgs) {
        return [];
      }
      const lowerQuery = query.toLowerCase();
      const renderRow = (name: string, description: string) => (
        <span css={skillRowStyles}>
          <span>{name}</span>
          <EuiText css={descriptionStyles} size="xs" color="subdued" component="span">
            {description}
          </EuiText>
        </span>
      );
      const commandOptions = availableCommands
        .filter(({ name }) => name.includes(lowerQuery))
        .map(({ name, description, iconType }) => ({
          key: `${SLASH_COMMAND_KEY_PREFIX}${name}`,
          label: name,
          iconType,
          renderLabel: renderRow(name, description),
        }));
      const skillOptions = skills
        .filter((skill) => skill.name.toLowerCase().includes(lowerQuery))
        .map((skill) => ({
          key: skill.id,
          label: skill.name,
          iconType: 'document',
          ...(skill.description ? { renderLabel: renderRow(skill.name, skill.description) } : {}),
        }));
      return [...commandOptions, ...skillOptions];
    }, [isTypingCommandArgs, availableCommands, skills, query, skillRowStyles]);

    // Lets the popover stay closed once it's clear there's nothing to show,
    // instead of leaving a "No matching results" panel open indefinitely as
    // the user keeps typing past an unresolved mention.
    const hasVisibleContent = !isTypingCommandArgs && (isLoading || options.length > 0);
    useEffect(() => {
      onContentChange?.(hasVisibleContent, query);
    }, [hasVisibleContent, query, onContentChange]);

    return (
      <CommandMenuList
        ref={ref}
        options={options}
        isLoading={isLoading}
        onSelect={(option: CommandMenuListOption) => {
          if (option.key.startsWith(SLASH_COMMAND_KEY_PREFIX)) {
            onReplaceText?.(`${option.label} `);
            return;
          }
          onSelect({
            commandId: CommandId.Skill,
            label: option.label,
            id: option.key,
            metadata: {},
          });
        }}
        width={SKILLS_MENU_WIDTH}
        data-test-subj="skillsMenu"
      />
    );
  }
);
