/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type {
  EntityItem,
  EntityScope,
  LinkItem,
  LinkStatus,
} from '../../../../common/investigations/types';
import { ICONS } from '../../icons';
import { EmptyState } from '../shared';
import type { TabProps } from '../tabs/tab_props';
import { EdgeInspector } from './edge_inspector';
import { NodeInspector } from './node_inspector';
import type { ScopeSelection } from './scope_helpers';
import * as i18n from './translations';

export interface ScopeInspectorProps {
  recordId: string;
  selection: ScopeSelection | null;
  entities: readonly EntityItem[];
  links: readonly LinkItem[];
  isUpdating: boolean;
  onSelect: (selection: ScopeSelection) => void;
  onSetEntityStatus: (entity: EntityItem, status: EntityScope) => void;
  onSetLinkStatus: (link: LinkItem, status: LinkStatus) => void;
  onAddLinkFrom: (entityId: string) => void;
  onNavigateTab: TabProps['onNavigateTab'];
}

/** The node or connection inspector for the current selection. */
export const ScopeInspector: React.FC<ScopeInspectorProps> = ({
  recordId,
  selection,
  entities,
  links,
  isUpdating,
  onSelect,
  onSetEntityStatus,
  onSetLinkStatus,
  onAddLinkFrom,
  onNavigateTab,
}) => {
  const entitiesById = new Map(entities.map((entity) => [entity.id, entity]));
  const selectedEntity = selection?.type === 'node' ? entitiesById.get(selection.id) : undefined;
  const selectedLink =
    selection?.type === 'edge' ? links.find((link) => link.id === selection.id) : undefined;

  if (selectedEntity) {
    return (
      <NodeInspector
        recordId={recordId}
        entity={selectedEntity}
        connections={links.filter(
          (link) => link.link.from_id === selectedEntity.id || link.link.to_id === selectedEntity.id
        )}
        entitiesById={entitiesById}
        isUpdating={isUpdating}
        onSetStatus={onSetEntityStatus}
        onSelectEdge={(linkId) => onSelect({ type: 'edge', id: linkId })}
        onAddLinkFrom={onAddLinkFrom}
        onNavigateTab={onNavigateTab}
      />
    );
  }

  if (selectedLink) {
    return (
      <EdgeInspector
        recordId={recordId}
        link={selectedLink}
        entitiesById={entitiesById}
        isUpdating={isUpdating}
        onSetStatus={onSetLinkStatus}
        onSelectNode={(entityId) => onSelect({ type: 'node', id: entityId })}
        onNavigateTab={onNavigateTab}
      />
    );
  }

  return (
    <EmptyState
      iconType={ICONS.scope}
      title={i18n.INSPECTOR_EMPTY_TITLE}
      body={i18n.INSPECTOR_EMPTY_BODY}
      data-test-subj="investigationScopeInspectorEmpty"
    />
  );
};
ScopeInspector.displayName = 'ScopeInspector';
