/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiDragDropContext,
  EuiDraggable,
  EuiDroppable,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiSelect,
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
import type {
  CustomLinkDraft,
  CustomLinkType,
  EntityTypeDraft,
  FlyoutTabConfig,
} from '../fake_entity_type_draft';
import { buildBlankCustomLink } from '../fake_entity_type_draft';

interface StepProps {
  readonly draft: EntityTypeDraft;
  readonly onChange: (next: FlyoutTabConfig[]) => void;
  readonly onCustomLinksChange: (next: CustomLinkDraft[]) => void;
}

export const FlyoutContentStep = ({ draft, onChange, onCustomLinksChange }: StepProps) => {
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
        customLinks={draft.customLinks}
        onCustomLinksChange={onCustomLinksChange}
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
  /**
   * Optional Custom-tab payload. When supplied (Step 4 of the wizard), the
   * Custom row reveals an inline link editor; when omitted (subset editor
   * "Content override" accordion, where this isn't authoring scope), the
   * Custom row keeps its compact toggle-only layout.
   */
  readonly customLinks?: readonly CustomLinkDraft[];
  readonly onCustomLinksChange?: (next: CustomLinkDraft[]) => void;
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
  customLinks,
  onCustomLinksChange,
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
        {tabs.map((tab, index) => {
          const showCustomEditor =
            tab.id === 'custom' &&
            tab.enabled &&
            customLinks !== undefined &&
            onCustomLinksChange !== undefined;
          return (
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
                  customLinksSlot={
                    showCustomEditor ? (
                      <CustomLinksEditor
                        links={customLinks}
                        onChange={onCustomLinksChange}
                        testSubjPrefix={`${testSubjPrefix}CustomLinks`}
                      />
                    ) : null
                  }
                />
              )}
            </EuiDraggable>
          );
        })}
      </EuiDroppable>
    </EuiDragDropContext>
  );
};

interface FlyoutTabRowProps {
  readonly tab: FlyoutTabConfig;
  readonly testSubjPrefix: string;
  readonly onToggle: (enabled: boolean) => void;
  readonly dragHandleProps?: DraggableProvidedDragHandleProps | null;
  /**
   * Optional content rendered inside the row's panel, below the
   * toggle line. Used today by the Custom tab to host its link editor;
   * the opacity dim applied to disabled rows intentionally does NOT
   * cascade here because the slot is only ever rendered when the tab
   * is enabled.
   */
  readonly customLinksSlot?: React.ReactNode;
}

const FlyoutTabRow = ({
  tab,
  testSubjPrefix,
  onToggle,
  dragHandleProps,
  customLinksSlot,
}: FlyoutTabRowProps) => {
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
      {customLinksSlot ? (
        <>
          <EuiHorizontalRule margin="m" />
          {customLinksSlot}
        </>
      ) : null}
    </EuiPanel>
  );
};

const CUSTOM_LINK_TYPE_OPTIONS: ReadonlyArray<{ value: CustomLinkType; text: string }> = [
  {
    value: 'runbook',
    text: i18n.translate('xpack.streams.entityCentricLab.editFlyout.content.linkType.runbook', {
      defaultMessage: 'Runbook',
    }),
  },
  {
    value: 'dashboard',
    text: i18n.translate('xpack.streams.entityCentricLab.editFlyout.content.linkType.dashboard', {
      defaultMessage: 'Dashboard',
    }),
  },
  {
    value: 'repository',
    text: i18n.translate('xpack.streams.entityCentricLab.editFlyout.content.linkType.repository', {
      defaultMessage: 'Repository',
    }),
  },
  {
    value: 'documentation',
    text: i18n.translate(
      'xpack.streams.entityCentricLab.editFlyout.content.linkType.documentation',
      { defaultMessage: 'Documentation' }
    ),
  },
  {
    value: 'other',
    text: i18n.translate('xpack.streams.entityCentricLab.editFlyout.content.linkType.other', {
      defaultMessage: 'Other',
    }),
  },
];

interface CustomLinksEditorProps {
  readonly links: readonly CustomLinkDraft[];
  readonly onChange: (next: CustomLinkDraft[]) => void;
  readonly testSubjPrefix: string;
}

/**
 * Inline editor for the curated links surfaced under the Custom tab.
 * Always renders at least one row (so the user has somewhere to type
 * even after deleting every link) and appends new rows via the
 * "Add link" button.
 */
const CustomLinksEditor = ({ links, onChange, testSubjPrefix }: CustomLinksEditorProps) => {
  // Render-time guarantee: never show an empty editor. We avoid mutating
  // the draft from here — the seeded blank row in the draft state covers
  // the initial mount, and `handleRemove` below re-seeds when the user
  // deletes the last row. Memoised so the callbacks below get a stable
  // dependency (avoids recreating them every render).
  const rows = useMemo<readonly CustomLinkDraft[]>(
    () => (links.length === 0 ? [buildBlankCustomLink()] : links),
    [links]
  );

  const updateLink = useCallback(
    (id: string, patch: Partial<CustomLinkDraft>) => {
      onChange(rows.map((link) => (link.id === id ? { ...link, ...patch } : link)));
    },
    [rows, onChange]
  );

  const handleRemove = useCallback(
    (id: string) => {
      const next = rows.filter((link) => link.id !== id);
      // Re-seed with a blank so the editor never collapses to an empty
      // state mid-session — matches the always-one-row invariant above.
      onChange(next.length === 0 ? [buildBlankCustomLink()] : next);
    },
    [rows, onChange]
  );

  const handleAdd = useCallback(() => {
    onChange([...rows, buildBlankCustomLink()]);
  }, [rows, onChange]);

  return (
    <div data-test-subj={`${testSubjPrefix}Editor`}>
      <EuiTitle size="xxs">
        <h5>
          {i18n.translate('xpack.streams.entityCentricLab.editFlyout.content.customLinks.title', {
            defaultMessage: 'Custom links',
          })}
        </h5>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <EuiText size="xs" color="subdued">
        <p>
          {i18n.translate('xpack.streams.entityCentricLab.editFlyout.content.customLinks.hint', {
            defaultMessage:
              'These links appear under the Custom tab when users open an entity of this type.',
          })}
        </p>
      </EuiText>
      <EuiSpacer size="s" />
      {rows.map((link, index) => (
        <CustomLinkRow
          key={link.id}
          link={link}
          index={index}
          testSubjPrefix={testSubjPrefix}
          onUpdate={(patch) => updateLink(link.id, patch)}
          onRemove={() => handleRemove(link.id)}
          showLabels={index === 0}
        />
      ))}
      <EuiSpacer size="s" />
      <EuiButtonEmpty
        iconType="plusInCircle"
        onClick={handleAdd}
        data-test-subj={`${testSubjPrefix}Add`}
      >
        {i18n.translate('xpack.streams.entityCentricLab.editFlyout.content.customLinks.addButton', {
          defaultMessage: 'Add link',
        })}
      </EuiButtonEmpty>
    </div>
  );
};

interface CustomLinkRowProps {
  readonly link: CustomLinkDraft;
  readonly index: number;
  readonly testSubjPrefix: string;
  readonly onUpdate: (patch: Partial<CustomLinkDraft>) => void;
  readonly onRemove: () => void;
  /**
   * EuiFormRow labels are heavy at every row; we only show them on the
   * first row (acts as a header) and elide them on subsequent rows so
   * the editor reads as a compact table.
   */
  readonly showLabels: boolean;
}

const CustomLinkRow = ({
  link,
  index,
  testSubjPrefix,
  onUpdate,
  onRemove,
  showLabels,
}: CustomLinkRowProps) => {
  const typeLabel = i18n.translate(
    'xpack.streams.entityCentricLab.editFlyout.content.customLinks.typeLabel',
    { defaultMessage: 'Link type' }
  );
  const urlLabel = i18n.translate(
    'xpack.streams.entityCentricLab.editFlyout.content.customLinks.urlLabel',
    { defaultMessage: 'URL' }
  );
  const labelLabel = i18n.translate(
    'xpack.streams.entityCentricLab.editFlyout.content.customLinks.labelLabel',
    { defaultMessage: 'Label' }
  );

  return (
    <EuiFlexGroup
      alignItems="flexEnd"
      gutterSize="s"
      responsive={false}
      // Compact stack between rows when labels are hidden.
      css={css`
        margin-top: ${showLabels ? 0 : 8}px;
      `}
    >
      <EuiFlexItem
        grow={false}
        css={css`
          width: 160px;
        `}
      >
        <EuiFormRow label={showLabels ? typeLabel : undefined} display="rowCompressed">
          <EuiSelect
            compressed
            options={[...CUSTOM_LINK_TYPE_OPTIONS]}
            value={link.type}
            onChange={(event) => onUpdate({ type: event.target.value as CustomLinkType })}
            aria-label={typeLabel}
            data-test-subj={`${testSubjPrefix}Type-${index}`}
          />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFormRow label={showLabels ? urlLabel : undefined} display="rowCompressed">
          <EuiFieldText
            compressed
            type="url"
            placeholder="https://"
            value={link.url}
            onChange={(event) => onUpdate({ url: event.target.value })}
            aria-label={urlLabel}
            data-test-subj={`${testSubjPrefix}Url-${index}`}
          />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFormRow label={showLabels ? labelLabel : undefined} display="rowCompressed">
          <EuiFieldText
            compressed
            value={link.label}
            onChange={(event) => onUpdate({ label: event.target.value })}
            aria-label={labelLabel}
            data-test-subj={`${testSubjPrefix}Label-${index}`}
          />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFormRow label={showLabels ? '\u00a0' : undefined} display="rowCompressed">
          <EuiButtonIcon
            iconType="cross"
            color="danger"
            onClick={onRemove}
            aria-label={i18n.translate(
              'xpack.streams.entityCentricLab.editFlyout.content.customLinks.removeAriaLabel',
              {
                defaultMessage: 'Remove link {index}',
                values: { index: index + 1 },
              }
            )}
            data-test-subj={`${testSubjPrefix}Remove-${index}`}
          />
        </EuiFormRow>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
