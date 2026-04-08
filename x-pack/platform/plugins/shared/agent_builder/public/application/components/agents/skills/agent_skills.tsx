/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPopover,
  EuiSpacer,
  EuiText,
  EuiIcon,
  EuiTitle,
} from '@elastic/eui';
import type { PublicSkillDefinition, PublicSkillSummary } from '@kbn/agent-builder-common';
import { useMutation, useQueryClient } from '@kbn/react-query';
import { searchParamNames } from '../../../search_param_names';
import { useQueryState } from '../../../hooks/use_query_state';
import { labels } from '../../../utils/i18n';
import { appPaths } from '../../../utils/app_paths';
import { useNavigation } from '../../../hooks/use_navigation';
import { useSkillsService } from '../../../hooks/skills/use_skills';
import { useAgentBuilderAgentById } from '../../../hooks/agents/use_agent_by_id';
import { useAgentBuilderServices } from '../../../hooks/use_agent_builder_service';
import { useToasts } from '../../../hooks/use_toasts';
import { queryKeys } from '../../../query_keys';
import { useFlyoutState } from '../../../hooks/use_flyout_state';
import { SkillLibraryPanel } from './skill_library_panel';
import { ActiveSkillRow } from './active_skill_row';
import { SkillDetailPanel } from './skill_detail_panel';
import { SkillEditFlyout } from './skill_edit_flyout';
import { SkillCreateFlyout } from './skill_create_flyout';
import { PageWrapper } from '../common/page_wrapper';
import { ICON_DIMENSIONS } from '../common/constants';
import { useListDetailPageStyles } from '../common/styles';

export const AgentSkills: React.FC = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const styles = useListDetailPageStyles();
  const { createAgentBuilderUrl } = useNavigation();
  const { agentService } = useAgentBuilderServices();
  const { addSuccessToast, addErrorToast } = useToasts();
  const queryClient = useQueryClient();

  const { agent, isLoading: agentLoading } = useAgentBuilderAgentById(agentId);
  const { skills: allSkills, isLoading: skillsLoading } = useSkillsService();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSkillId, setSelectedSkillId] = useQueryState<string>(searchParamNames.skillId);
  const pendingSelectSkillIdRef = useRef<string | null>(null);
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [isCreateFlyoutOpen, setIsCreateFlyoutOpen] = useState(false);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [mutatingSkillId, setMutatingSkillId] = useState<string | null>(null);
  const {
    isOpen: isLibraryOpen,
    openFlyout: openLibrary,
    closeFlyout: closeLibrary,
  } = useFlyoutState();

  const handleImportFromLibrary = () => {
    setIsAddMenuOpen(false);
    openLibrary();
  };

  const handleOpenCreateFlyout = () => {
    setIsAddMenuOpen(false);
    setIsCreateFlyoutOpen(true);
  };

  const agentSkillIds = useMemo(
    () => agent?.configuration?.skill_ids,
    [agent?.configuration?.skill_ids]
  );

  const agentSkillIdSet = useMemo(
    () => (agentSkillIds ? new Set(agentSkillIds) : undefined),
    [agentSkillIds]
  );

  const enableElasticCapabilities = agent?.configuration?.enable_elastic_capabilities ?? false;

  const builtinSkills = useMemo(() => allSkills.filter((s) => s.readonly), [allSkills]);

  const builtinSkillIdSet = useMemo(() => new Set(builtinSkills.map((s) => s.id)), [builtinSkills]);

  const activeSkills = useMemo(() => {
    if (!agentSkillIdSet) return allSkills;
    if (enableElasticCapabilities) {
      const explicitSkills = allSkills.filter((s) => agentSkillIdSet.has(s.id));
      const builtinNotExplicit = builtinSkills.filter((s) => !agentSkillIdSet.has(s.id));
      return [...explicitSkills, ...builtinNotExplicit];
    }
    return allSkills.filter((s) => agentSkillIdSet.has(s.id));
  }, [allSkills, agentSkillIdSet, enableElasticCapabilities, builtinSkills]);

  useEffect(() => {
    if (agentLoading || skillsLoading) return;

    if (pendingSelectSkillIdRef.current) {
      const pendingInActive = activeSkills.some((s) => s.id === pendingSelectSkillIdRef.current);
      if (pendingInActive) {
        setSelectedSkillId(pendingSelectSkillIdRef.current);
        pendingSelectSkillIdRef.current = null;
        return;
      }
    }

    if (!selectedSkillId) {
      if (activeSkills.length > 0) {
        setSelectedSkillId(activeSkills[0].id);
      }
    } else {
      const stillActive = activeSkills.some((s) => s.id === selectedSkillId);
      if (!stillActive) {
        setSelectedSkillId(activeSkills[0]?.id ?? null);
      }
    }
  }, [activeSkills, selectedSkillId, setSelectedSkillId, agentLoading, skillsLoading]);

  const filteredActiveSkills = useMemo(() => {
    if (!searchQuery.trim()) return activeSkills;
    const lower = searchQuery.toLowerCase();
    return activeSkills.filter(
      (s) => s.name.toLowerCase().includes(lower) || s.description.toLowerCase().includes(lower)
    );
  }, [activeSkills, searchQuery]);

  const updateSkillsMutation = useMutation({
    mutationFn: (newSkillIds: string[]) => {
      return agentService.update(agentId!, { configuration: { skill_ids: newSkillIds } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agentProfiles.byId(agentId) });
    },
    onError: () => {
      addErrorToast({ title: labels.agentSkills.updateSkillsErrorToast });
    },
  });

  const handleAddSkill = (
    skill: PublicSkillSummary | PublicSkillDefinition,
    { selectOnSuccess = false }: { selectOnSuccess?: boolean } = {}
  ) => {
    const currentIds = agentSkillIds ?? allSkills.map((s) => s.id);
    if (currentIds.includes(skill.id)) return;
    const newIds = [...currentIds, skill.id];
    setMutatingSkillId(skill.id);
    updateSkillsMutation.mutate(newIds, {
      onSuccess: () => {
        if (selectOnSuccess) {
          pendingSelectSkillIdRef.current = skill.id;
        }
        addSuccessToast({ title: labels.agentSkills.addSkillSuccessToast(skill.name) });
      },
      onSettled: () => setMutatingSkillId(null),
    });
  };

  const handleRemoveSkill = (skill: PublicSkillSummary) => {
    const currentIds = agentSkillIds ?? allSkills.map((s) => s.id);
    const newIds = currentIds.filter((id) => id !== skill.id);
    setMutatingSkillId(skill.id);
    updateSkillsMutation.mutate(newIds, {
      onSuccess: () => {
        setSelectedSkillId(null);
        addSuccessToast({ title: labels.agentSkills.removeSkillSuccessToast(skill.name) });
      },
      onSettled: () => setMutatingSkillId(null),
    });
  };

  const handleToggleSkill = (skill: PublicSkillSummary, isActive: boolean) => {
    if (enableElasticCapabilities && skill.readonly) return;
    if (isActive) {
      handleAddSkill(skill);
    } else {
      handleRemoveSkill(skill);
    }
  };

  const handleRemoveSelectedSkill = () => {
    if (!selectedSkillId) return;
    const skill = activeSkills.find((s) => s.id === selectedSkillId);
    if (skill) {
      if (enableElasticCapabilities && skill.readonly) return;
      handleRemoveSkill(skill);
    }
  };

  const libraryActiveSkillIdSet = useMemo(() => {
    if (!agentSkillIdSet) return new Set(allSkills.map((s) => s.id));
    if (enableElasticCapabilities) return new Set([...agentSkillIdSet, ...builtinSkillIdSet]);
    return agentSkillIdSet;
  }, [agentSkillIdSet, allSkills, enableElasticCapabilities, builtinSkillIdSet]);

  const isLoading = agentLoading || skillsLoading;

  if (isLoading) {
    return (
      <EuiFlexGroup alignItems="center" justifyContent="center" css={styles.loadingSpinner}>
        <EuiLoadingSpinner size="xl" />
      </EuiFlexGroup>
    );
  }

  return (
    <PageWrapper>
      <div css={styles.header}>
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiIcon type="bolt" aria-hidden={true} css={ICON_DIMENSIONS} />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiTitle size="l">
                  <h1>{labels.skills.title}</h1>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty href={createAgentBuilderUrl(appPaths.manage.skills)}>
                  {labels.agentSkills.manageAllSkills}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiPopover
                  aria-label={labels.agentSkills.addSkillButton}
                  button={
                    <EuiButton
                      fill
                      iconType="plusInCircle"
                      iconSide="left"
                      onClick={() => setIsAddMenuOpen((prev) => !prev)}
                    >
                      {labels.agentSkills.addSkillButton}
                    </EuiButton>
                  }
                  isOpen={isAddMenuOpen}
                  closePopover={() => setIsAddMenuOpen(false)}
                  anchorPosition="downLeft"
                  panelPaddingSize="none"
                >
                  <EuiContextMenuPanel
                    items={[
                      <EuiContextMenuItem
                        key="importFromLibrary"
                        icon="importAction"
                        onClick={handleImportFromLibrary}
                      >
                        {labels.agentSkills.importFromLibraryMenuItem}
                      </EuiContextMenuItem>,
                      <EuiContextMenuItem
                        key="createSkill"
                        icon="pencil"
                        onClick={handleOpenCreateFlyout}
                      >
                        {labels.agentSkills.createSkillMenuItem}
                      </EuiContextMenuItem>,
                    ]}
                  />
                </EuiPopover>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          {labels.agentSkills.pageDescription}
        </EuiText>
      </div>

      <EuiFlexGroup gutterSize="none" responsive={false} css={styles.body}>
        <EuiFlexItem grow={false} css={styles.searchColumn}>
          <div css={styles.searchInputWrapper}>
            <EuiFieldSearch
              placeholder={labels.agentSkills.searchActiveSkillsPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              incremental
              fullWidth
            />
          </div>

          <div css={styles.scrollableList}>
            {filteredActiveSkills.length === 0 ? (
              <EuiText size="s" color="subdued" textAlign="center">
                <p>
                  {searchQuery.trim()
                    ? labels.agentSkills.noActiveSkillsMatchMessage
                    : labels.agentSkills.noActiveSkillsMessage}
                </p>
              </EuiText>
            ) : (
              filteredActiveSkills.map((skill) => (
                <ActiveSkillRow
                  key={skill.id}
                  skill={skill}
                  isSelected={selectedSkillId === skill.id}
                  onSelect={(s) => setSelectedSkillId(s.id)}
                  onRemove={handleRemoveSkill}
                  isRemoving={mutatingSkillId === skill.id}
                  readOnly={enableElasticCapabilities && skill.readonly}
                />
              ))
            )}
          </div>
        </EuiFlexItem>

        <EuiFlexItem css={styles.detailPanelWrapper}>
          {selectedSkillId ? (
            <SkillDetailPanel
              skillId={selectedSkillId}
              onEdit={() => setEditingSkillId(selectedSkillId)}
              onRemove={handleRemoveSelectedSkill}
              isReadOnly={
                enableElasticCapabilities &&
                (activeSkills.find((s) => s.id === selectedSkillId)?.readonly ?? false)
              }
            />
          ) : (
            <EuiFlexGroup
              justifyContent="center"
              alignItems="center"
              css={styles.noSelectionPlaceholder}
            >
              <EuiText size="s" color="subdued">
                {labels.agentSkills.noSkillSelectedMessage}
              </EuiText>
            </EuiFlexGroup>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>

      {isLibraryOpen && (
        <SkillLibraryPanel
          onClose={closeLibrary}
          allSkills={allSkills}
          activeSkillIdSet={libraryActiveSkillIdSet}
          onToggleSkill={handleToggleSkill}
          mutatingSkillId={mutatingSkillId}
          enableElasticCapabilities={enableElasticCapabilities}
          builtinSkillIdSet={builtinSkillIdSet}
        />
      )}

      {editingSkillId && (
        <SkillEditFlyout
          skillId={editingSkillId}
          onClose={() => setEditingSkillId(null)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: queryKeys.skills.byId(editingSkillId) });
            setSelectedSkillId(editingSkillId);
          }}
        />
      )}

      {isCreateFlyoutOpen && (
        <SkillCreateFlyout
          onClose={() => setIsCreateFlyoutOpen(false)}
          onSkillCreated={(skill) => handleAddSkill(skill, { selectOnSuccess: true })}
        />
      )}
    </PageWrapper>
  );
};
