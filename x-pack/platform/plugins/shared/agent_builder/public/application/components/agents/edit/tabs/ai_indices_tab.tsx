/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { CONTEXT_ENGINE_PATHS } from '@kbn/context-engine-plugin/common/paths';
import { Controller } from 'react-hook-form';
import type { Control } from 'react-hook-form';
import { useListAiIndices } from '../../../../hooks/ai_indices/use_list_ai_indices';
import { useInheritedAiIndices } from '../../../../hooks/ai_indices/use_inherited_ai_indices';
import { useNavigation } from '../../../../hooks/use_navigation';
import { labels } from '../../../../utils/i18n';
import type { AgentFormData } from '../agent_form';

interface AiIndexRow {
  id: string;
  /**
   * Contributed by the agent's type. It applies whether or not the agent stores it, so the row is
   * ticked and disabled, and is never written back onto the agent.
   */
  isInherited: boolean;
  /** Stored on the agent or its type, but unknown to the Context Engine (deleted, or beyond the list cap). */
  isUnregistered: boolean;
}

interface AiIndicesTabProps {
  control: Control<AgentFormData>;
  /** Undefined while creating an agent, when there is no persisted agent to inherit from yet. */
  agentId?: string;
  isFormDisabled: boolean;
}

export const AiIndicesTab: React.FC<AiIndicesTabProps> = ({ control, agentId, isFormDisabled }) => {
  const { aiIndices, isLoading: isLoadingAiIndices, error } = useListAiIndices();
  const { inheritedAiIndicesByAgentId, isLoading: isLoadingInherited } = useInheritedAiIndices();

  const inheritedIds = useMemo(
    () => (agentId ? inheritedAiIndicesByAgentId[agentId] ?? [] : []),
    [agentId, inheritedAiIndicesByAgentId]
  );

  return (
    <>
      <EuiSpacer size="l" />
      <EuiText size="s" color="subdued">
        <p>{labels.aiIndices.tabDescription}</p>
      </EuiText>
      <EuiSpacer size="m" />
      {error ? (
        <>
          <KbnWarningCallout
            announceOnMount
            title={labels.aiIndices.loadErrorMessage}
            data-test-subj="agentBuilderAiIndicesError"
          />
          <EuiSpacer size="m" />
        </>
      ) : null}
      <Controller
        name="configuration.ai_indices"
        control={control}
        render={({ field }) => (
          <AiIndicesSelection
            registeredIds={aiIndices.map((aiIndex) => aiIndex.id)}
            assignedIds={field.value ?? []}
            inheritedIds={inheritedIds}
            isLoading={isLoadingAiIndices || isLoadingInherited}
            isDisabled={isFormDisabled}
            onChange={field.onChange}
          />
        )}
      />
    </>
  );
};

interface AiIndicesSelectionProps {
  registeredIds: string[];
  /** AI indices assigned to the agent itself: editable, and the only ones a change writes back. */
  assignedIds: string[];
  inheritedIds: string[];
  isLoading: boolean;
  isDisabled: boolean;
  onChange: (assignedIds: string[]) => void;
}

const AiIndicesSelection: React.FC<AiIndicesSelectionProps> = ({
  registeredIds,
  assignedIds,
  inheritedIds,
  isLoading,
  isDisabled,
  onChange,
}) => {
  const { navigateToContextEngine } = useNavigation();

  const inheritedIdSet = useMemo(() => new Set(inheritedIds), [inheritedIds]);
  const assignedIdSet = useMemo(() => new Set(assignedIds), [assignedIds]);

  const rows = useMemo<AiIndexRow[]>(() => {
    const registeredIdSet = new Set(registeredIds);

    // Inherited and assigned ids are listed even when the Context Engine does not know them: a type
    // may point at an unregistered index, and an agent may reference one that was since deleted.
    // Leaving an assigned id out would also drop it silently on the next save.
    const orderedIds = [
      ...inheritedIds,
      ...registeredIds.filter((id) => !inheritedIdSet.has(id)),
      ...assignedIds.filter((id) => !inheritedIdSet.has(id) && !registeredIdSet.has(id)),
    ];

    return orderedIds.map((id) => ({
      id,
      isInherited: inheritedIdSet.has(id),
      isUnregistered: !registeredIdSet.has(id),
    }));
  }, [registeredIds, inheritedIds, inheritedIdSet, assignedIds]);

  const handleToggle = useCallback(
    (id: string) => {
      onChange(
        assignedIdSet.has(id)
          ? assignedIds.filter((assigned) => assigned !== id)
          : [...assignedIds, id]
      );
    },
    [assignedIds, assignedIdSet, onChange]
  );

  const columns = useMemo(
    () => [
      {
        width: '40px',
        render: (row: AiIndexRow) => {
          const checkbox = (
            <EuiCheckbox
              id={`agentBuilderAiIndex-${row.id}`}
              aria-label={row.id}
              checked={row.isInherited || assignedIdSet.has(row.id)}
              onChange={() => handleToggle(row.id)}
              disabled={isDisabled || row.isInherited}
              data-test-subj={`agentBuilderAiIndexCheckbox-${row.id}`}
            />
          );
          // An inherited id the agent also stores stays disabled: unticking it would drop the
          // assignment while the type keeps contributing it, so nothing would change on screen.
          return row.isInherited ? (
            <EuiToolTip content={labels.aiIndices.inheritedTooltip}>{checkbox}</EuiToolTip>
          ) : (
            checkbox
          );
        },
      },
      {
        field: 'id',
        name: labels.aiIndices.nameColumn,
        render: (id: string) => <EuiText size="s">{id}</EuiText>,
      },
      {
        width: '160px',
        align: 'right' as const,
        render: (row: AiIndexRow) => {
          if (row.isInherited) {
            return <EuiBadge color="hollow">{labels.aiIndices.inheritedBadge}</EuiBadge>;
          }
          return row.isUnregistered ? (
            <EuiBadge color="warning">{labels.aiIndices.unregisteredBadge}</EuiBadge>
          ) : null;
        },
      },
    ],
    [assignedIdSet, handleToggle, isDisabled]
  );

  if (isLoading) {
    return <EuiLoadingSpinner size="l" />;
  }

  return (
    <>
      <EuiInMemoryTable
        tableCaption={labels.aiIndices.tableCaption}
        columns={columns}
        items={rows}
        itemId="id"
        search={{ box: { incremental: true, placeholder: labels.aiIndices.searchPlaceholder } }}
        noItemsMessage={labels.aiIndices.noAiIndicesMessage}
        data-test-subj="agentBuilderAiIndicesTable"
      />
      <EuiFlexGroup justifyContent="flexStart">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            iconType="plus"
            size="s"
            onClick={() => navigateToContextEngine(CONTEXT_ENGINE_PATHS.create)}
            data-test-subj="agentBuilderCreateAiIndexLink"
          >
            {labels.aiIndices.createNewAiIndex}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
