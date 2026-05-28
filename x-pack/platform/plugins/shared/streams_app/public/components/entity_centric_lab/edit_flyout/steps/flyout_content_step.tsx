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

interface StepProps {
  readonly draft: EntityTypeDraft;
  readonly onChange: (next: FlyoutTabConfig[]) => void;
}

export const FlyoutContentStep = ({ draft, onChange }: StepProps) => {
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
      <FlyoutTabsList
        tabs={draft.flyoutTabs}
        onChange={onChange}
        droppableId="entityCentricLabFlyoutTabsDroppable"
        testSubjPrefix="entityCentricLabEditFlyoutContent"
      />
    </div>
  );
};

export interface FlyoutTabsListProps {
  readonly tabs: readonly FlyoutTabConfig[];
  readonly onChange: (next: FlyoutTabConfig[]) => void;
  /** Must be unique across simultaneously rendered drag-drop contexts. */
  readonly droppableId: string;
  /** Prefix used to derive data-test-subj values. */
  readonly testSubjPrefix: string;
}

/**
 * Reusable drag-and-drop list of flyout-tab toggles. Used both from Step 4
 * of the wizard and from the subset editor's "Content override" accordion.
 */
export const FlyoutTabsList = ({
  tabs,
  onChange,
  droppableId,
  testSubjPrefix,
}: FlyoutTabsListProps) => {
  const handleDragEnd: DragDropContextProps['onDragEnd'] = useCallback(
    ({ source, destination }) => {
      if (source && destination) {
        const next = euiDragDropReorder([...tabs], source.index, destination.index);
        onChange(next);
      }
    },
    [tabs, onChange]
  );

  const handleToggle = useCallback(
    (id: string, enabled: boolean) => {
      onChange(tabs.map((tab) => (tab.id === id ? { ...tab, enabled } : tab)));
    },
    [tabs, onChange]
  );

  return (
    <EuiDragDropContext onDragEnd={handleDragEnd}>
      <EuiDroppable
        droppableId={droppableId}
        spacing="m"
        data-test-subj={`${testSubjPrefix}Droppable`}
      >
        {tabs.map((tab, index) => (
          <EuiDraggable
            key={tab.id}
            index={index}
            draggableId={`${droppableId}-${tab.id}`}
            spacing="m"
            usePortal
            hasInteractiveChildren
            customDragHandle
          >
            {(provided) => (
              <FlyoutTabRow
                tab={tab}
                testSubjPrefix={testSubjPrefix}
                onToggle={(enabled) => handleToggle(tab.id, enabled)}
                dragHandleProps={provided.dragHandleProps}
              />
            )}
          </EuiDraggable>
        ))}
      </EuiDroppable>
    </EuiDragDropContext>
  );
};

interface FlyoutTabRowProps {
  readonly tab: FlyoutTabConfig;
  readonly testSubjPrefix: string;
  readonly onToggle: (enabled: boolean) => void;
  readonly dragHandleProps?: DraggableProvidedDragHandleProps | null;
}

const FlyoutTabRow = ({ tab, testSubjPrefix, onToggle, dragHandleProps }: FlyoutTabRowProps) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="m"
      css={css`
        opacity: ${tab.enabled ? 1 : 0.55};
      `}
      data-test-subj={`${testSubjPrefix}Row-${tab.id}`}
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
            data-test-subj={`${testSubjPrefix}Handle-${tab.id}`}
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
            data-test-subj={`${testSubjPrefix}Toggle-${tab.id}`}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
