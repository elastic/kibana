/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useState } from 'react';
import type { CriteriaWithPagination } from '@elastic/eui';
import {
  EuiBadge,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiInMemoryTable,
  EuiLink,
  EuiLoadingSpinner,
  EuiPanel,
  EuiProgress,
  EuiSearchBar,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { PublicSkillDefinition, SkillSelection } from '@kbn/agent-builder-common';
import { hasSkillSelectionWildcard, getExplicitSkillIds } from '@kbn/agent-builder-common';
import { Controller } from 'react-hook-form';
import type { Control } from 'react-hook-form';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { AgentFormData } from '../agent_form';
import { labels } from '../../../../utils/i18n';
import { useNavigation } from '../../../../hooks/use_navigation';
import { appPaths } from '../../../../utils/app_paths';

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
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const showActiveOnlyChangeHandler = !isFormDisabled ? setShowActiveOnly : undefined;

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
            showActiveOnly={showActiveOnly || isFormDisabled}
            onShowActiveOnlyChange={showActiveOnlyChangeHandler}
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
  showActiveOnly: boolean;
  onShowActiveOnlyChange?: (showActiveOnly: boolean) => void;
}

const SkillsSelection: React.FC<SkillsSelectionProps> = ({
  skills,
  skillsLoading,
  selectedSkills,
  onSkillsChange,
  disabled = false,
  showActiveOnly,
  onShowActiveOnlyChange,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

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

    return result;
  }, [skills, showActiveOnly, isSkillActive]);

  const filteredSkills = useMemo(() => {
    if (!searchQuery) {
      return displaySkills;
    }

    return EuiSearchBar.Query.execute(EuiSearchBar.Query.parse(searchQuery), displaySkills, {
      defaultFields: ['id', 'name', 'description'],
    });
  }, [searchQuery, displaySkills]);

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

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    setPageIndex(0);
  }, []);

  const handleTableChange = useCallback(
    ({ page }: CriteriaWithPagination<PublicSkillDefinition>) => {
      if (page) {
        setPageIndex(page.index);
        if (page.size !== pageSize) {
          setPageSize(page.size);
          setPageIndex(0);
        }
      }
    },
    [pageSize]
  );

  if (skillsLoading) {
    return <EuiLoadingSpinner size="l" />;
  }

  const columns = [
    createCheckboxColumn(isSkillActive, handleToggleSkill, disabled),
    createSkillDetailsColumn(),
    createTypeColumn(),
  ];

  return (
    <div>
      <ActiveSkillsStatus activeSkillsCount={activeSkillsCount} totalSkills={skills.length} />

      <EuiSpacer size="l" />

      <EuiFlexGroup alignItems="center" gutterSize="m">
        <EuiFlexItem>
          <EuiSearchBar
            box={{
              incremental: true,
              placeholder: labels.skills.searchSkillsPlaceholder,
            }}
            onChange={({ queryText, error }) => {
              if (!error) {
                handleSearchChange(queryText);
              }
            }}
            query={searchQuery}
          />
        </EuiFlexItem>
        {onShowActiveOnlyChange && (
          <EuiFlexItem grow={false}>
            <EuiSwitch
              label={i18n.translate('xpack.agentBuilder.skills.showActiveOnly', {
                defaultMessage: 'Show active only',
              })}
              checked={showActiveOnly}
              onChange={(e) => onShowActiveOnlyChange(e.target.checked)}
              disabled={disabled}
              compressed
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <EuiFlexGroup justifyContent="flexStart">
        <EuiText size="xs">
          <FormattedMessage
            id="xpack.agentBuilder.skills.skillsSelectionSummary"
            defaultMessage="Showing {start}-{end} of {total} {skills}"
            values={{
              start: <strong>{Math.min(pageIndex * pageSize + 1, filteredSkills.length)}</strong>,
              end: <strong>{Math.min((pageIndex + 1) * pageSize, filteredSkills.length)}</strong>,
              total: filteredSkills.length,
              skills: <strong>{labels.skills.title}</strong>,
            }}
          />
        </EuiText>
      </EuiFlexGroup>

      <EuiInMemoryTable
        columns={columns}
        items={filteredSkills}
        itemId="id"
        pagination={{
          pageIndex,
          pageSize,
          pageSizeOptions: [10, 25, 50, 100],
          showPerPageOptions: true,
        }}
        onTableChange={handleTableChange}
        sorting={{
          sort: {
            field: 'id',
            direction: 'asc',
          },
        }}
        noItemsMessage={
          skills.length > 0 ? labels.skills.noSkillsMatchMessage : labels.skills.noSkillsMessage
        }
      />
    </div>
  );
};

const ActiveSkillsStatus: React.FC<{ activeSkillsCount: number; totalSkills: number }> = ({
  activeSkillsCount,
  totalSkills,
}) => {
  const { createAgentBuilderUrl } = useNavigation();
  const isZeroSkills = activeSkillsCount === 0;
  const statusColor = isZeroSkills ? 'warning' : 'success';
  const iconType = isZeroSkills ? 'alert' : 'checkCircleFill';

  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="m">
      <EuiFlexGroup alignItems="center" gutterSize="l">
        <EuiFlexItem grow={1}>
          <EuiFlexGroup direction="column">
            <EuiFlexItem>
              <EuiFlexGroup direction="row" gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiIcon type={iconType} color={statusColor} size="m" />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="m" color={statusColor}>
                    <strong>
                      {i18n.translate('xpack.agentBuilder.activeSkillsStatus.title', {
                        defaultMessage:
                          'This agent has {count} active {count, plural, one {skill} other {skills}}',
                        values: { count: activeSkillsCount },
                      })}
                    </strong>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="s" color="subdued">
                <FormattedMessage
                  id="xpack.agentBuilder.activeSkillsStatus.description"
                  defaultMessage="{skillsLink} provide specialized knowledge and instructions that guide agents on specific tasks."
                  values={{
                    skillsLink: (
                      <EuiLink href={createAgentBuilderUrl(appPaths.skills.list)}>
                        {labels.skills.title}
                      </EuiLink>
                    ),
                  }}
                />
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem grow={1}>
          <EuiProgress
            value={activeSkillsCount}
            max={totalSkills}
            color={statusColor}
            size="m"
            label={i18n.translate('xpack.agentBuilder.activeSkillsStatus.progressLabel', {
              defaultMessage: 'Active skills',
            })}
            valueText={`${activeSkillsCount}/${totalSkills}`}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

const SkillDetailsColumn: React.FC<{ skill: PublicSkillDefinition }> = ({ skill }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexGroup direction="column" gutterSize="xs">
      <EuiText
        size="s"
        css={css`
          font-weight: ${euiTheme.font.weight.semiBold};
        `}
      >
        {skill.id}
      </EuiText>
      <EuiText size="s" color="subdued">
        {skill.description}
      </EuiText>
    </EuiFlexGroup>
  );
};

const createCheckboxColumn = (
  isSkillActive: (skill: PublicSkillDefinition) => boolean,
  onToggle: (skillId: string) => void,
  disabled: boolean
) => ({
  width: '40px',
  render: (skill: PublicSkillDefinition) => (
    <EuiCheckbox
      id={`skill-${skill.id}`}
      checked={isSkillActive(skill)}
      onChange={() => onToggle(skill.id)}
      disabled={disabled}
    />
  ),
});

const createSkillDetailsColumn = () => ({
  name: labels.skills.skillIdLabel,
  sortable: (item: PublicSkillDefinition) => item.id,
  width: '60%',
  render: (item: PublicSkillDefinition) => <SkillDetailsColumn skill={item} />,
});

const createTypeColumn = () => ({
  field: 'readonly',
  name: labels.skills.typeLabel,
  render: (readonly: boolean) => (
    <EuiBadge color={readonly ? 'hollow' : 'primary'}>
      {readonly ? labels.skills.builtinLabel : labels.skills.customLabel}
    </EuiBadge>
  ),
});
