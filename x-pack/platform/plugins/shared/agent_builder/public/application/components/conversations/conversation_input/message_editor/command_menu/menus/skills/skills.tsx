/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { forwardRef, useCallback, useMemo } from 'react';
import { css } from '@emotion/react';
import { EuiText, useEuiTheme } from '@elastic/eui';
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
    const { euiTheme } = useEuiTheme();
    const agentId = useAgentId();
    const { skills, isLoading } = useAgentSkills({ agentId });

    const skillRowStyles = useMemo(
      () => css`
        display: flex;
        align-items: baseline;
        gap: ${euiTheme.size.s};
        min-width: 0;
      `,
      [euiTheme.size.s]
    );

    const options: CommandMenuListOption[] = useMemo(() => {
      const lowerQuery = query.toLowerCase();
      return skills
        .filter((skill) => skill.name.toLowerCase().includes(lowerQuery))
        .map((skill) => {
          if (!skill.description) {
            return { key: skill.id, label: skill.name };
          }
          return {
            key: skill.id,
            label: skill.name,
            renderLabel: (
              <span css={skillRowStyles}>
                <span>{skill.name}</span>
                <EuiText css={descriptionStyles} size="xs" color="subdued" component="span">
                  {skill.description}
                </EuiText>
              </span>
            ),
          };
        });
    }, [skills, query, skillRowStyles]);

    const noMatch = query.length > 0 && options.length === 0 && !isLoading;

    const handleSelect = useCallback(
      (option: CommandMenuListOption) => {
        onSelect({
          commandId: CommandId.Skill,
          label: option.label,
          id: option.key,
          metadata: {},
        });
      },
      [onSelect]
    );

    const handleCommitInvalid = useCallback(() => {
      // Unlike a connector name, a skill name can legitimately contain
      // spaces, so capping at the first space is a best-effort guess at
      // what the user meant to reference, not a guarantee like it is for
      // a single-token connector name. Escape (rather than Space) is the
      // trigger here precisely because Space can't double as "done typing".
      const spaceIndex = query.indexOf(' ');
      const consumedQuery = spaceIndex === -1 ? query : query.slice(0, spaceIndex);
      onSelect({
        commandId: CommandId.Skill,
        label: consumedQuery,
        id: '',
        metadata: {},
        matched: false,
        consumedLength: consumedQuery.length,
      });
    }, [onSelect, query]);

    return (
      <CommandMenuList
        ref={ref}
        options={options}
        isLoading={isLoading}
        onSelect={handleSelect}
        onEscapeNoMatch={noMatch ? handleCommitInvalid : undefined}
        width={SKILLS_MENU_WIDTH}
        data-test-subj="skillsMenu"
      />
    );
  }
);
