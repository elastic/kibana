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
import {
  hasSkillSelectionWildcard,
  getExplicitSkillIds,
  skillMatchSelection,
} from '@kbn/agent-builder-common';
import { Controller } from 'react-hook-form';
import type { Control } from 'react-hook-form';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { AgentFormData } from '../agent_form';
import { labels } from '../../../../utils/i18n';
import { useNavigation } from '../../../../hooks/use_navigation';
import { appPaths } from '../../../../utils/app_paths';

const ACTIVE_SKILLS_WARNING_THRESHOLD = 10;

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

// -- Active Skills Status Panel --

const ActiveSkillsStatus: React.FC<{
  activeSkillsCount: number;
  warningThreshold: number;
}> = ({ activeSkillsCount, warningThreshold }) => {
  const { createAgentBuilderUrl } = useNavigation();
  const isOverThreshold = activeSkillsCount > warningThreshold;
  const isZeroSkills = activeSkillsCount === 0;
  const shouldShowWarning = isOverThreshold || isZeroSkills;

  const statusColor = shouldShowWarning ? 'warning' : 'success';
  const iconType = shouldShowWarning ? 'alert' : 'checkInCircleFilled';

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="m"
      aria-label={i18n.translate('xpack.agentBuilder.activeSkillsStatus.panelLabel', {
        defaultMessage: 'Active skills status panel',
      })}
      role="region"
    >
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
                        defaultMessage: 'This agent has {count} active skills',
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
                  defaultMessage="{skillsLink} provide specialized capabilities and domain knowledge for agents. For best results, keep the selection under {threshold} to stay focused."
                  values={{
                    skillsLink: (
                      <EuiLink href={createAgentBuilderUrl(appPaths.skills.list)}>
                        {i18n.translate('xpack.agentBuilder.activeSkillsStatus.skillsLinkText', {
                          defaultMessage: 'Skills',
                        })}
                      </EuiLink>
                    ),
                    threshold: warningThreshold,
                  }}
                />
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem grow={1}>
          <EuiProgress
            value={activeSkillsCount}
            max={warningThreshold}
            color={statusColor}
            size="m"
            label={i18n.translate('xpack.agentBuilder.activeSkillsStatus.progressLabel', {
              defaultMessage: 'Active skills',
            })}
            valueText={`${activeSkillsCount}/${warningThreshold}`}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

// -- Skill Details Column (ID + description stacked) --

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

// -- Skills Selection (main component) --

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
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const isAllSelected = hasSkillSelectionWildcard(selectedSkills);

  const isSkillActive = useCallback(
    (skillId: string) => skillMatchSelection(skillId, selectedSkills),
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

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    setPageIndex(0);
  }, []);

  const columns = useMemo(
    () => [
      {
        width: '40px',
        render: (skill: PublicSkillDefinition) => (
          <EuiCheckbox
            id={`skill-${skill.id}`}
            checked={isSkillActive(skill.id)}
            onChange={() => handleToggleSkill(skill.id)}
            disabled={disabled}
          />
        ),
      },
      {
        name: labels.skills.skillIdLabel,
        sortable: (item: PublicSkillDefinition) => item.id,
        width: '60%',
        render: (item: PublicSkillDefinition) => <SkillDetailsColumn skill={item} />,
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
    ],
    [isSkillActive, handleToggleSkill, disabled]
  );

  if (skillsLoading) {
    return <EuiLoadingSpinner size="l" />;
  }

  return (
    <div>
      <ActiveSkillsStatus
        activeSkillsCount={activeSkillsCount}
        warningThreshold={ACTIVE_SKILLS_WARNING_THRESHOLD}
      />

      <EuiSpacer size="l" />

      <EuiFlexGroup alignItems="center" gutterSize="m">
        <EuiFlexItem>
          <EuiSearchBar
            box={{
              incremental: true,
              placeholder: labels.skills.searchSkillsPlaceholder,
            }}
            filters={[
              {
                type: 'field_value_selection',
                field: 'readonly',
                name: labels.skills.typeLabel,
                multiSelect: false,
                options: [
                  { value: true, name: labels.skills.builtinLabel },
                  { value: false, name: labels.skills.customLabel },
                ],
              },
            ]}
            onChange={({ queryText }) => handleSearchChange(queryText ?? '')}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSwitch
            label={i18n.translate('xpack.agentBuilder.agents.form.skills.showActiveOnly', {
              defaultMessage: 'Show active only',
            })}
            checked={showActiveOnly}
            onChange={(e) => setShowActiveOnly(e.target.checked)}
            compressed
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <EuiFlexGroup justifyContent="flexStart">
        <EuiText size="xs">
          <FormattedMessage
            id="xpack.agentBuilder.skills.skillsSelectionSummary"
            defaultMessage="Showing {start}-{end} of {total} {skills}"
            values={{
              start: <strong>{Math.min(pageIndex * pageSize + 1, displaySkills.length)}</strong>,
              end: <strong>{Math.min((pageIndex + 1) * pageSize, displaySkills.length)}</strong>,
              total: displaySkills.length,
              skills: <strong>{labels.skills.title}</strong>,
            }}
          />
        </EuiText>
      </EuiFlexGroup>

      <EuiInMemoryTable
        items={displaySkills}
        columns={columns}
        itemId="id"
        pagination={{
          pageIndex,
          pageSize,
          pageSizeOptions: [10, 25, 50, 100],
          showPerPageOptions: true,
        }}
        onTableChange={({ page }: CriteriaWithPagination<PublicSkillDefinition>) => {
          if (page) {
            setPageIndex(page.index);
            if (page.size !== pageSize) {
              setPageSize(page.size);
              setPageIndex(0);
            }
          }
        }}
        sorting={{
          sort: {
            field: 'id',
            direction: 'asc',
          },
        }}
        noItemsMessage={
          <EuiText component="p" size="s" textAlign="center" color="subdued">
            {skills.length > 0 ? labels.skills.noSkillsMatchMessage : labels.skills.noSkillsMessage}
          </EuiText>
        }
      />
    </div>
  );
};
