/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useState } from 'react';
import type { CriteriaWithPagination } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiLoadingSpinner,
  EuiSearchBar,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import type { PublicSkillDefinition, SkillSelection } from '@kbn/agent-builder-common';
import { hasSkillSelectionWildcard, getExplicitSkillIds } from '@kbn/agent-builder-common';
import { Controller } from 'react-hook-form';
import type { Control } from 'react-hook-form';
import { i18n } from '@kbn/i18n';
import type { AgentFormData } from '../agent_form';
import { labels } from '../../../../utils/i18n';
import {
  createSkillIdColumn,
  createSkillDescriptionColumn,
  createSkillTypeColumn,
} from '../../../skills/skills_columns';

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
  const [sortField, setSortField] = useState<keyof PublicSkillDefinition>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [pageIndex, setPageIndex] = useState(0);
  const pageSize = 20;

  const isAllBuiltinSelected = hasSkillSelectionWildcard(selectedSkills);
  const explicitSelectedIds = useMemo(
    () => new Set(getExplicitSkillIds(selectedSkills)),
    [selectedSkills]
  );

  const isSkillActive = useCallback(
    (skill: PublicSkillDefinition) => {
      if (isAllBuiltinSelected && skill.readonly) {
        return true;
      }
      return explicitSelectedIds.has(skill.id);
    },
    [isAllBuiltinSelected, explicitSelectedIds]
  );

  const displaySkills = useMemo(() => {
    let result = skills;

    if (showActiveOnly) {
      result = skills.filter((skill) => isSkillActive(skill));
    }

    if (searchQuery) {
      result = EuiSearchBar.Query.execute(EuiSearchBar.Query.parse(searchQuery), result, {
        defaultFields: ['id', 'name', 'description'],
      });
    }

    return result;
  }, [skills, showActiveOnly, searchQuery, isSkillActive]);

  const sortedAndPaginatedSkills = useMemo(() => {
    const sorted = [...displaySkills].sort((a, b) => {
      const aVal = String(a[sortField] ?? '');
      const bVal = String(b[sortField] ?? '');
      const cmp = aVal.localeCompare(bVal);
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return sorted.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
  }, [displaySkills, sortField, sortDirection, pageIndex, pageSize]);

  const activeSkillsCount = useMemo(() => {
    return skills.filter((skill) => isSkillActive(skill)).length;
  }, [skills, isSkillActive]);

  const handleToggleSkill = useCallback(
    (skillId: string) => {
      const skill = skills.find((s) => s.id === skillId);
      if (!skill) return;

      if (isAllBuiltinSelected && skill.readonly) {
        const builtinIds = skills.filter((s) => s.readonly && s.id !== skillId).map((s) => s.id);
        const explicitIds = getExplicitSkillIds(selectedSkills);
        onSkillsChange([{ skill_ids: [...builtinIds, ...explicitIds] }]);
      } else if (explicitSelectedIds.has(skillId)) {
        const newExplicitIds = getExplicitSkillIds(selectedSkills).filter((id) => id !== skillId);
        if (isAllBuiltinSelected) {
          onSkillsChange([{ skill_ids: ['*', ...newExplicitIds] }]);
        } else {
          onSkillsChange(newExplicitIds.length > 0 ? [{ skill_ids: newExplicitIds }] : []);
        }
      } else {
        const currentExplicitIds = getExplicitSkillIds(selectedSkills);
        if (isAllBuiltinSelected) {
          onSkillsChange([{ skill_ids: ['*', ...currentExplicitIds, skillId] }]);
        } else {
          onSkillsChange([{ skill_ids: [...currentExplicitIds, skillId] }]);
        }
      }
    },
    [isAllBuiltinSelected, explicitSelectedIds, selectedSkills, skills, onSkillsChange]
  );

  if (skillsLoading) {
    return <EuiLoadingSpinner size="l" />;
  }

  const columns = [
    createSkillIdColumn(),
    createSkillDescriptionColumn(),
    createSkillTypeColumn(),
    {
      width: '80px',
      name: i18n.translate('xpack.agentBuilder.agents.form.skills.activeColumn', {
        defaultMessage: 'Active',
      }),
      render: (skill: PublicSkillDefinition) => (
        <EuiSwitch
          label=""
          showLabel={false}
          checked={isSkillActive(skill)}
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
          defaultMessage: '{count} of {total} {total, plural, one {skill} other {skills}} active',
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
        items={sortedAndPaginatedSkills}
        columns={columns}
        itemId="id"
        pagination={{
          pageIndex,
          pageSize,
          totalItemCount: displaySkills.length,
          showPerPageOptions: false,
        }}
        sorting={{
          sort: {
            field: sortField,
            direction: sortDirection,
          },
        }}
        onChange={({ sort, page }: CriteriaWithPagination<PublicSkillDefinition>) => {
          if (sort) {
            setSortField(sort.field);
            setSortDirection(sort.direction);
          }
          if (page) {
            setPageIndex(page.index);
          }
        }}
        noItemsMessage={
          skills.length > 0 ? labels.skills.noSkillsMatchMessage : labels.skills.noSkillsMessage
        }
      />
    </div>
  );
};
