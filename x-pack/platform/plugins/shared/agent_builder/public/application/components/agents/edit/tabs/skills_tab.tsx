/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useState } from 'react';
import {
  EuiBasicTable,
  EuiLoadingSpinner,
  EuiSearchBar,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
} from '@elastic/eui';
import type { PublicSkillDefinition, SkillSelection } from '@kbn/agent-builder-common';
import {
  hasSkillSelectionWildcard,
  getExplicitSkillIds,
  skillMatchSelection,
} from '@kbn/agent-builder-common';
import { Controller } from 'react-hook-form';
import type { Control } from 'react-hook-form';
import { i18n } from '@kbn/i18n';
import type { AgentFormData } from '../agent_form';
import { labels } from '../../../../utils/i18n';

interface SkillsTabProps {
  control: Control<AgentFormData>;
  skills: PublicSkillDefinition[];
  isLoading: boolean;
  isFormDisabled: boolean;
}

export const SkillsTab: React.FC<SkillsTabProps> = ({
  control,
  skills,
  isLoading,
  isFormDisabled,
}) => {
  return (
    <>
      <EuiSpacer size="l" />
      <Controller
        name="configuration.skills"
        control={control}
        render={({ field }) => (
          <SkillsSelection
            skills={skills}
            skillsLoading={isLoading}
            selectedSkills={field.value ?? [{ skill_ids: ['*'] }]}
            onSkillsChange={field.onChange}
            disabled={isFormDisabled}
          />
        )}
      />
    </>
  );
};

interface SkillsSelectionProps {
  skills: PublicSkillDefinition[];
  skillsLoading: boolean;
  selectedSkills: SkillSelection[];
  onSkillsChange: (skills: SkillSelection[]) => void;
  disabled?: boolean;
}

const SkillsSelection: React.FC<SkillsSelectionProps> = ({
  skills,
  skillsLoading,
  selectedSkills,
  onSkillsChange,
  disabled = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  const isAllSelected = hasSkillSelectionWildcard(selectedSkills);

  const isSkillActive = useCallback(
    (skillId: string) => {
      return skillMatchSelection(skillId, selectedSkills);
    },
    [selectedSkills]
  );

  const displaySkills = useMemo(() => {
    let result = skills;

    if (showActiveOnly) {
      result = skills.filter((skill) => isSkillActive(skill.id));
    }

    if (searchQuery) {
      result = EuiSearchBar.Query.execute(EuiSearchBar.Query.parse(searchQuery), result, {
        defaultFields: ['id', 'name', 'description'],
      });
    }

    return result;
  }, [skills, showActiveOnly, searchQuery, isSkillActive]);

  const activeSkillsCount = useMemo(() => {
    if (isAllSelected) return skills.length;
    const explicitIds = new Set(getExplicitSkillIds(selectedSkills));
    return skills.filter((skill) => explicitIds.has(skill.id)).length;
  }, [skills, selectedSkills, isAllSelected]);

  const handleToggleSkill = useCallback(
    (skillId: string) => {
      if (isAllSelected) {
        // Switch from wildcard to explicit list, excluding this skill
        const allIds = skills.map((s) => s.id).filter((id) => id !== skillId);
        onSkillsChange([{ skill_ids: allIds }]);
      } else {
        const explicitIds = getExplicitSkillIds(selectedSkills);
        const isCurrentlySelected = explicitIds.includes(skillId);
        if (isCurrentlySelected) {
          const newIds = explicitIds.filter((id) => id !== skillId);
          onSkillsChange(newIds.length > 0 ? [{ skill_ids: newIds }] : []);
        } else {
          onSkillsChange([{ skill_ids: [...explicitIds, skillId] }]);
        }
      }
    },
    [isAllSelected, selectedSkills, skills, onSkillsChange]
  );

  if (skillsLoading) {
    return <EuiLoadingSpinner size="l" />;
  }

  const columns = [
    {
      field: 'id',
      name: labels.skills.skillIdLabel,
      sortable: true,
      width: '30%',
      render: (id: string, skill: PublicSkillDefinition) => (
        <EuiFlexGroup direction="column" gutterSize="none">
          <EuiFlexItem>
            <EuiText size="s">
              <strong>{id}</strong>
            </EuiText>
          </EuiFlexItem>
          {skill.name !== id && (
            <EuiFlexItem>
              <EuiText size="xs" color="subdued">
                {skill.name}
              </EuiText>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      ),
    },
    {
      field: 'description',
      name: labels.skills.descriptionLabel,
      truncateText: true,
      width: '40%',
    },
    {
      field: 'readonly',
      name: labels.skills.typeLabel,
      width: '100px',
      render: (readonly: boolean) => (
        <EuiBadge color={readonly ? 'hollow' : 'primary'}>
          {readonly ? labels.skills.builtinLabel : labels.skills.customLabel}
        </EuiBadge>
      ),
    },
    {
      width: '80px',
      name: i18n.translate('xpack.agentBuilder.agents.form.skills.activeColumn', {
        defaultMessage: 'Active',
      }),
      render: (skill: PublicSkillDefinition) => (
        <EuiSwitch
          label=""
          showLabel={false}
          checked={isSkillActive(skill.id)}
          onChange={() => handleToggleSkill(skill.id)}
          disabled={disabled}
          compressed
          data-test-subj={`agentFormSkillToggle-${skill.id}`}
        />
      ),
    },
  ];

  return (
    <div>
      <EuiText size="s" color="subdued">
        {i18n.translate('xpack.agentBuilder.agents.form.skills.activeCount', {
          defaultMessage:
            '{count} of {total} {total, plural, one {skill} other {skills}} active',
          values: { count: activeSkillsCount, total: skills.length },
        })}
      </EuiText>

      <EuiSpacer size="m" />

      <EuiFlexGroup gutterSize="m" alignItems="center">
        <EuiFlexItem>
          <EuiSearchBar
            box={{
              incremental: true,
              placeholder: labels.skills.searchSkillsPlaceholder,
            }}
            onChange={({ queryText }) => setSearchQuery(queryText ?? '')}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSwitch
            label={i18n.translate('xpack.agentBuilder.agents.form.skills.showActiveOnly', {
              defaultMessage: 'Active only',
            })}
            checked={showActiveOnly}
            onChange={(e) => setShowActiveOnly(e.target.checked)}
            compressed
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <EuiBasicTable
        items={displaySkills}
        columns={columns}
        itemId="id"
        sorting={{
          sort: {
            field: 'id',
            direction: 'asc',
          },
        }}
        noItemsMessage={
          skills.length > 0
            ? labels.skills.noSkillsMatchMessage
            : labels.skills.noSkillsMessage
        }
      />
    </div>
  );
};
