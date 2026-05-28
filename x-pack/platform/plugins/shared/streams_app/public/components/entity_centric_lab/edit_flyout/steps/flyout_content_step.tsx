/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiDragDropContext,
  EuiDraggable,
  EuiDroppable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
  euiDragDropReorder,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { DragDropContextProps } from '@elastic/eui';
import type { DraggableProvidedDragHandleProps } from '@hello-pangea/dnd';
import type { EntityTypeDraft, FlyoutTabConfig } from '../fake_entity_type_draft';

interface Props {
  readonly draft: EntityTypeDraft;
  readonly onChange: (next: FlyoutTabConfig[]) => void;
}

export const FlyoutContentStep = ({ draft, onChange }: Props) => {
  const { flyoutTabs } = draft;

  const handleDragEnd: DragDropContextProps['onDragEnd'] = useCallback(
    ({ source, destination }) => {
      if (source && destination) {
        const next = euiDragDropReorder([...flyoutTabs], source.index, destination.index);
        onChange(next);
      }
    },
    [flyoutTabs, onChange]
  );

  const handleToggle = useCallback(
    (id: string, enabled: boolean) => {
      onChange(flyoutTabs.map((tab) => (tab.id === id ? { ...tab, enabled } : tab)));
    },
    [flyoutTabs, onChange]
  );

  return (
    <div data-test-subj="entityCentricLabEditFlyoutContentStep">
      <EuiText size="s">
        <p>
          {i18n.translate('xpack.streams.entityCentricLab.editFlyout.content.intro', {
            defaultMessage:
              'Define the flyout content for this entity type. You can re-order the tabs by drag and dropping them.',
          })}
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiTitle size="xs">
        <h3>
          {i18n.translate('xpack.streams.entityCentricLab.editFlyout.content.flyoutTabsTitle', {
            defaultMessage: 'Flyout tabs',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiDragDropContext onDragEnd={handleDragEnd}>
        <EuiDroppable
          droppableId="entityCentricLabFlyoutTabsDroppable"
          spacing="m"
          data-test-subj="entityCentricLabEditFlyoutContentDroppable"
        >
          {flyoutTabs.map((tab, index) => (
            <EuiDraggable
              key={tab.id}
              index={index}
              draggableId={tab.id}
              spacing="m"
              hasInteractiveChildren
              customDragHandle
            >
              {(provided) => (
                <FlyoutTabRow
                  tab={tab}
                  onToggle={(enabled) => handleToggle(tab.id, enabled)}
                  dragHandleProps={provided.dragHandleProps}
                />
              )}
            </EuiDraggable>
          ))}
        </EuiDroppable>
      </EuiDragDropContext>
    </div>
  );
};

interface FlyoutTabRowProps {
  readonly tab: FlyoutTabConfig;
  readonly onToggle: (enabled: boolean) => void;
  readonly dragHandleProps?: DraggableProvidedDragHandleProps | null;
}

const FlyoutTabRow = ({ tab, onToggle, dragHandleProps }: FlyoutTabRowProps) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="m"
      css={css`
        opacity: ${tab.enabled ? 1 : 0.55};
      `}
      data-test-subj={`entityCentricLabEditFlyoutContentRow-${tab.id}`}
    >
      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
        <EuiFlexItem grow={false}>
          <span
            {...(dragHandleProps ?? {})}
            aria-label={i18n.translate(
              'xpack.streams.entityCentricLab.editFlyout.content.dragHandleAriaLabel',
              {
                defaultMessage: 'Drag to reorder {label} tab',
                values: { label: tab.label },
              }
            )}
            css={css`
              display: inline-flex;
              cursor: grab;
              color: ${euiTheme.colors.textSubdued};
            `}
            data-test-subj={`entityCentricLabEditFlyoutContentHandle-${tab.id}`}
          >
            <EuiIcon type="grab" aria-hidden={true} />
          </span>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h4>{tab.label}</h4>
          </EuiTitle>
          <EuiText size="xs" color="subdued">
            <p>{tab.description}</p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSwitch
            showLabel={false}
            label={i18n.translate(
              'xpack.streams.entityCentricLab.editFlyout.content.toggleAriaLabel',
              {
                defaultMessage: 'Enable {label} tab',
                values: { label: tab.label },
              }
            )}
            checked={tab.enabled}
            onChange={(event) => onToggle(event.target.checked)}
            data-test-subj={`entityCentricLabEditFlyoutContentToggle-${tab.id}`}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
