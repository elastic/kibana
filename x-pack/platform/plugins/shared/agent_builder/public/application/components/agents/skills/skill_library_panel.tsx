/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiCallOut,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiLink,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { PublicSkillSummary } from '@kbn/agent-builder-common';
import { labels } from '../../../utils/i18n';
import { useNavigation } from '../../../hooks/use_navigation';
import { appPaths } from '../../../utils/app_paths';

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
  const { createAgentBuilderUrl } = useNavigation();
  const manageLibraryUrl = createAgentBuilderUrl(appPaths.manage.skills);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSkills = useMemo(() => {
    if (!searchQuery.trim()) return allSkills;
    const lower = searchQuery.toLowerCase();
    return allSkills.filter(
      (s) => s.name.toLowerCase().includes(lower) || s.description.toLowerCase().includes(lower)
    );
  }, [allSkills, searchQuery]);

  return (
    <EuiFlyout
      side="right"
      size="960px"
      onClose={onClose}
      aria-labelledby="skillLibraryFlyoutTitle"
      pushMinBreakpoint="xs"
      hideCloseButton={false}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h2 id="skillLibraryFlyoutTitle">{labels.agentSkills.addSkillFromLibraryTitle}</h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiLink href={manageLibraryUrl} external>
              {labels.agentSkills.manageSkillLibraryLink}
            </EuiLink>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFieldSearch
          placeholder={labels.agentSkills.searchAvailableSkillsPlaceholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          incremental
          fullWidth
        />

        <EuiSpacer size="m" />

        <EuiText size="xs" color="subdued">
          {labels.agentSkills.availableSkillsSummary(filteredSkills.length, allSkills.length)}
        </EuiText>

        <EuiSpacer size="m" />

        {enableElasticCapabilities && (
          <>
            <EuiCallOut
              size="s"
              iconType="iInCircle"
              title={labels.agentSkills.elasticCapabilitiesCallout}
            />
            <EuiSpacer size="m" />
          </>
        )}

        {filteredSkills.length === 0 ? (
          <EuiText size="s" color="subdued" textAlign="center">
            {searchQuery.trim()
              ? labels.agentSkills.noAvailableSkillsMatchMessage
              : labels.agentSkills.noAvailableSkillsMessage}
          </EuiText>
        ) : (
          <EuiFlexGroup direction="column" gutterSize="m">
            {filteredSkills.map((skill) => (
              <EuiFlexItem key={skill.id} grow={false}>
                <SkillToggleRow
                  skill={skill}
                  isActive={activeSkillIdSet.has(skill.id)}
                  onToggle={onToggleSkill}
                  isMutating={mutatingSkillId === skill.id}
                  enableElasticCapabilities={enableElasticCapabilities}
                  builtinSkillIdSet={builtinSkillIdSet}
                />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};

interface SkillToggleRowProps {
  skill: PublicSkillSummary;
  isActive: boolean;
  onToggle: (skill: PublicSkillSummary, isActive: boolean) => void;
  isMutating: boolean;
  enableElasticCapabilities?: boolean;
  builtinSkillIdSet?: Set<string>;
}

/**
 * A single row in the skill library list showing name, description,
 * and a toggle switch to add/remove the skill from the agent.
 */
const SkillToggleRow: React.FC<SkillToggleRowProps> = ({
  skill,
  isActive,
  onToggle,
  isMutating,
  enableElasticCapabilities = false,
  builtinSkillIdSet,
}) => {
  const { euiTheme } = useEuiTheme();
  const isBuiltinManaged = enableElasticCapabilities && (builtinSkillIdSet?.has(skill.id) ?? false);

  return (
    <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
      <EuiFlexItem>
        <EuiText
          size="s"
          css={css`
            font-weight: ${euiTheme.font.weight.semiBold};
          `}
        >
          {skill.name}
        </EuiText>
        <EuiText
          size="xs"
          color="subdued"
          css={css`
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          `}
        >
          {skill.description}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        {isBuiltinManaged ? (
          <EuiToolTip content={labels.agentSkills.elasticCapabilitiesManagedTooltip}>
            <EuiSwitch
              label={skill.name}
              showLabel={false}
              checked={true}
              onChange={() => {}}
              disabled={true}
              compressed
            />
          </EuiToolTip>
        ) : (
          <EuiSwitch
            label={skill.name}
            showLabel={false}
            checked={isActive}
            onChange={(e) => onToggle(skill, e.target.checked)}
            disabled={isMutating}
            compressed
          />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
