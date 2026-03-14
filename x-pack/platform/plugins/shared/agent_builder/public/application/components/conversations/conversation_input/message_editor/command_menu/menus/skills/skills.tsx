/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiSelectable,
  EuiLoadingSpinner,
  EuiFlexGroup,
  EuiFlexItem,
  useEuiTheme,
  keys,
} from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { CommandMenuComponentProps, CommandMenuHandle } from '../../types';
import { useSkills } from './use_skills';

const MENU_WIDTH = 280;
const MENU_MAX_HEIGHT = 240;

const loadingLabel = i18n.translate(
  'xpack.agentBuilder.conversationInput.commandMenu.skills.loading',
  { defaultMessage: 'Loading skills...' }
);

const noMatchesLabel = i18n.translate(
  'xpack.agentBuilder.conversationInput.commandMenu.skills.noMatches',
  { defaultMessage: 'No matching skills' }
);

export const Skills = forwardRef<CommandMenuHandle, CommandMenuComponentProps>(
  ({ query, onSelect }, ref) => {
    const { skills, isLoading } = useSkills();
    const { euiTheme } = useEuiTheme();
    const [activeIndex, setActiveIndex] = useState(0);

    const filteredSkills = useMemo(() => {
      const lowerQuery = query.toLowerCase();
      return skills.filter((skill) => skill.name.toLowerCase().includes(lowerQuery));
    }, [skills, query]);

    useEffect(() => {
      setActiveIndex(0);
    }, [filteredSkills.length, query]);

    const options: EuiSelectableOption[] = useMemo(
      () =>
        filteredSkills.map((skill, index) => ({
          label: skill.name,
          key: skill.id,
          checked: index === activeIndex ? 'on' : undefined,
        })),
      [filteredSkills, activeIndex]
    );

    useImperativeHandle(ref, () => ({
      isKeyDownEventHandled: (event: React.KeyboardEvent): boolean => {
        const handledKeys = [keys.ARROW_DOWN, keys.ARROW_UP, keys.ENTER, keys.TAB];
        return handledKeys.includes(event.key);
      },
      handleKeyDown: (event: React.KeyboardEvent): void => {
        if (event.key === keys.ARROW_DOWN) {
          setActiveIndex((prev) => Math.min(prev + 1, filteredSkills.length - 1));
        } else if (event.key === keys.ARROW_UP) {
          setActiveIndex((prev) => Math.max(prev - 1, 0));
        } else if (event.key === keys.ENTER || event.key === keys.TAB) {
          if (filteredSkills.length > 0) {
            onSelect(filteredSkills[activeIndex].name);
          }
        }
      },
    }));

    const containerStyles = css`
      width: ${MENU_WIDTH}px;
    `;

    const activeHighlightStyles = css`
      .euiSelectableListItem:nth-child(${activeIndex + 1}) {
        background-color: ${euiTheme.colors.backgroundLightPrimary};
      }
    `;

    if (isLoading) {
      return (
        <EuiFlexGroup
          justifyContent="center"
          alignItems="center"
          css={css`
            width: ${MENU_WIDTH}px;
            padding: ${euiTheme.size.m};
          `}
          data-test-subj="skillsMenuLoading"
        >
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="m" aria-label={loadingLabel} />
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    return (
      <div css={[containerStyles, activeHighlightStyles]} data-test-subj="skillsMenu">
        <EuiSelectable
          options={options}
          singleSelection
          listProps={{
            showIcons: false,
            bordered: false,
            css: css`
              max-height: ${MENU_MAX_HEIGHT}px;
            `,
          }}
          onChange={(newOptions) => {
            const selected = newOptions.find((opt) => opt.checked === 'on');
            if (selected) {
              onSelect(selected.label);
            }
          }}
          emptyMessage={noMatchesLabel}
        >
          {(list) => list}
        </EuiSelectable>
      </div>
    );
  }
);
