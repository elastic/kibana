/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SerializedStyles } from '@emotion/react';
import React, { useCallback, useState } from 'react';
import type { KiListItem } from '../../../../../common/http_api/knowledge_indicators';
import type { SelectedKi } from '../../../hooks/use_selected_ki';
import { usePrefetchKi } from '../../../hooks/use_prefetch_ki';
import type { ListKiGroup as ListKiGroupData } from './list_ki_groups_helpers';
import { ListKiGroup } from './list_ki_group';

interface ListKiGroupsProps {
  aiIndexId: string;
  groups: ListKiGroupData[];
  selectedKi?: SelectedKi;
  onSelectKi: (ki: KiListItem) => void;
  onShowMore: (type: string, loadedCount: number) => void;
  isRefetching?: boolean;
  discoverHref?: string;
  listCss: SerializedStyles;
}

export const ListKiGroups = ({
  aiIndexId,
  groups,
  selectedKi,
  onSelectKi,
  onShowMore,
  isRefetching = false,
  discoverHref,
  listCss,
}: ListKiGroupsProps) => {
  const prefetchKi = usePrefetchKi(aiIndexId);
  const [collapsedTypes, setCollapsedTypes] = useState<ReadonlySet<string>>(new Set());

  const toggleGroup = useCallback((type: string) => {
    setCollapsedTypes((current) => {
      const next = new Set(current);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  const isKiSelected = useCallback(
    (ki: KiListItem) =>
      selectedKi !== undefined &&
      ki.id === selectedKi.kiId &&
      (selectedKi.index.length === 0 || ki.index === selectedKi.index),
    [selectedKi]
  );

  return (
    <div
      role="listbox"
      aria-label={i18n.translate('xpack.contextEngine.aiIndexDetail.listKi.listLabel', {
        defaultMessage: 'Knowledge documents',
      })}
      aria-busy={isRefetching}
      css={listCss}
      data-test-subj="contextListKiList"
    >
      {groups.map((group, position) => (
        <ListKiGroup
          key={group.type}
          group={group}
          isFirst={position === 0}
          isCollapsed={collapsedTypes.has(group.type)}
          onToggle={toggleGroup}
          isKiSelected={isKiSelected}
          onSelectKi={onSelectKi}
          onHoverKi={prefetchKi}
          onShowMore={onShowMore}
          discoverHref={discoverHref}
        />
      ))}
    </div>
  );
};
