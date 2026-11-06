/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiListGroup,
  EuiListGroupItem,
  EuiPopover,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  getNodeChildren,
  type AppNode,
  type AppNodeType,
  type DocumentIssue,
} from '@kbn/custom-app-common';
import { IconButton } from './fields/fields';
import { NODE_CATALOG, getCatalogEntry, type NodeGroup } from './node_catalog';

const GROUP_LABELS: Record<NodeGroup, string> = {
  layout: i18n.translate('xpack.customApp.editor.groupLayout', { defaultMessage: 'Layout' }),
  content: i18n.translate('xpack.customApp.editor.groupContent', { defaultMessage: 'Content' }),
  data: i18n.translate('xpack.customApp.editor.groupData', { defaultMessage: 'Data' }),
  input: i18n.translate('xpack.customApp.editor.groupInput', { defaultMessage: 'Inputs' }),
};
const GROUP_ORDER: readonly NodeGroup[] = ['layout', 'content', 'data', 'input'];

/** A few words about a node, so several of one kind can be told apart in the tree. */
const summarize = (node: AppNode): string => {
  switch (node.type) {
    case 'heading':
    case 'text':
      return node.text;
    case 'callout':
    case 'stat':
    case 'metric':
    case 'flyout':
      return node.title;
    case 'card':
      return node.title ?? '';
    case 'badge':
      return node.text;
    case 'section':
      return node.label;
    case 'progress':
      return node.label ?? '';
    case 'chart':
      return node.title ?? node.query.split('\n')[0];
    case 'custom_content':
      return (
        node.query?.split('\n')[0] ??
        i18n.translate('xpack.customApp.editor.staticContent', { defaultMessage: 'Static content' })
      );
    case 'select':
    case 'button_group':
    case 'switch':
    case 'search':
    case 'list_input':
    case 'button':
    case 'link':
      return node.label;
    case 'form':
      return node.submitLabel;
    case 'table':
    case 'key_value':
      // The first line of the query, as the text that tells two tables apart.
      return node.source
        ? i18n.translate('xpack.customApp.editor.casesSummary', { defaultMessage: 'Cases' })
        : (node.query ?? '').split('\n')[0];
    case 'time_range':
      return i18n.translate('xpack.customApp.editor.timeRangeSummary', {
        defaultMessage: 'Period of the app',
      });
    case 'stack':
      return node.direction;
    default:
      // A component with nothing to tell it apart by, such as one this editor has no form for.
      return '';
  }
};

interface OutlineTreeProps {
  root: AppNode;
  selectedId: string;
  issues: readonly DocumentIssue[];
  onSelect: (id: string) => void;
}

const OutlineTree = ({ root, selectedId, issues, onSelect }: OutlineTreeProps) => {
  const { euiTheme } = useEuiTheme();
  const withIssues = new Set(issues.map(({ nodeId }) => nodeId));

  const row = (node: AppNode): React.ReactNode => {
    const entry = getCatalogEntry(node.type);
    const isSelected = node.id === selectedId;
    const summary = summarize(node);
    const children = getNodeChildren(node);

    return (
      <li key={node.id}>
        <button
          type="button"
          aria-current={isSelected ? 'true' : undefined}
          data-test-subj={`customAppOutline-${node.id}`}
          onClick={() => onSelect(node.id)}
          css={css({
            display: 'flex',
            alignItems: 'center',
            gap: euiTheme.size.s,
            width: '100%',
            textAlign: 'left',
            border: 'none',
            cursor: 'pointer',
            padding: euiTheme.size.xs,
            paddingInlineEnd: euiTheme.size.s,
            borderRadius: euiTheme.border.radius.medium,
            // The accent bar and the tint together say which component is being edited.
            borderInlineStart: `${euiTheme.size.xxs} solid ${
              isSelected ? euiTheme.colors.primary : 'transparent'
            }`,
            color: euiTheme.colors.text,
            backgroundColor: isSelected
              ? euiTheme.colors.backgroundBaseInteractiveSelect
              : 'transparent',
            '&:hover': {
              backgroundColor: isSelected
                ? euiTheme.colors.backgroundBaseInteractiveSelect
                : euiTheme.colors.backgroundBaseInteractiveHover,
            },
          })}
        >
          <span
            aria-hidden="true"
            css={css({
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              width: euiTheme.size.xl,
              height: euiTheme.size.xl,
              borderRadius: euiTheme.border.radius.medium,
              backgroundColor: isSelected
                ? euiTheme.colors.backgroundBasePrimary
                : euiTheme.colors.backgroundBaseSubdued,
            })}
          >
            <EuiIcon
              type={entry.iconType}
              size="m"
              color={isSelected ? 'primary' : 'text'}
              aria-hidden={true}
            />
          </span>
          <span css={css({ fontWeight: euiTheme.font.weight.medium })}>{entry.label}</span>
          {summary && (
            <EuiText
              component="span"
              size="xs"
              color="subdued"
              css={css({ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })}
            >
              {summary}
            </EuiText>
          )}
          {withIssues.has(node.id) && (
            <EuiIcon
              type="warning"
              color="danger"
              title={i18n.translate('xpack.customApp.editor.hasProblems', {
                defaultMessage: 'Needs attention',
              })}
            />
          )}
        </button>
        {children.length > 0 && (
          // A line down the side of what a component holds, so the nesting can be read at a glance.
          <ul
            css={css({
              listStyle: 'none',
              margin: 0,
              marginInlineStart: euiTheme.size.base,
              paddingInlineStart: euiTheme.size.xs,
              borderInlineStart: euiTheme.border.thin,
            })}
          >
            {children.map((child) => row(child))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <ul
      aria-label={i18n.translate('xpack.customApp.editor.outlineLabel', {
        defaultMessage: 'Components',
      })}
      css={css({ listStyle: 'none', margin: 0, padding: 0 })}
    >
      {row(root)}
    </ul>
  );
};

interface OutlineToolbarProps {
  /** The selected node is the root, which cannot be moved, copied or removed. */
  isRootSelected: boolean;
  onAdd: (type: AppNodeType) => void;
  onDuplicate: () => void;
  onMove: (direction: 'up' | 'down') => void;
  onRemove: () => void;
}

const OutlineToolbar = ({
  isRootSelected,
  onAdd,
  onDuplicate,
  onMove,
  onRemove,
}: OutlineToolbarProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiPopover
          aria-label={i18n.translate('xpack.customApp.editor.addMenuLabel', {
            defaultMessage: 'Components you can add',
          })}
          isOpen={isOpen}
          closePopover={() => setIsOpen(false)}
          anchorPosition="downLeft"
          panelPaddingSize="s"
          button={
            <EuiButtonEmpty
              size="s"
              iconType="plusCircle"
              data-test-subj="customAppAddComponent"
              onClick={() => setIsOpen(!isOpen)}
            >
              {i18n.translate('xpack.customApp.editor.add', { defaultMessage: 'Add' })}
            </EuiButtonEmpty>
          }
        >
          {GROUP_ORDER.map((group) => (
            <div key={group}>
              <EuiTitle size="xxxs">
                <h4>{GROUP_LABELS[group]}</h4>
              </EuiTitle>
              <EuiListGroup>
                {NODE_CATALOG.filter((entry) => entry.group === group).map((entry) => (
                  <EuiListGroupItem
                    key={entry.type}
                    iconType={entry.iconType}
                    label={entry.label}
                    toolTipText={entry.description}
                    onClick={() => {
                      setIsOpen(false);
                      onAdd(entry.type);
                    }}
                  />
                ))}
              </EuiListGroup>
            </div>
          ))}
        </EuiPopover>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <IconButton
          iconType="copy"
          label={i18n.translate('xpack.customApp.editor.duplicate', {
            defaultMessage: 'Duplicate',
          })}
          isDisabled={isRootSelected}
          onClick={onDuplicate}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <IconButton
          iconType="chevronSingleUp"
          label={i18n.translate('xpack.customApp.editor.moveUp', { defaultMessage: 'Move up' })}
          isDisabled={isRootSelected}
          onClick={() => onMove('up')}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <IconButton
          iconType="chevronSingleDown"
          label={i18n.translate('xpack.customApp.editor.moveDown', { defaultMessage: 'Move down' })}
          isDisabled={isRootSelected}
          onClick={() => onMove('down')}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <IconButton
          iconType="trash"
          color="danger"
          label={i18n.translate('xpack.customApp.editor.delete', { defaultMessage: 'Delete' })}
          isDisabled={isRootSelected}
          onClick={onRemove}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const OutlinePane = ({
  root,
  selectedId,
  issues,
  onSelect,
  ...toolbar
}: OutlineTreeProps & OutlineToolbarProps) => (
  <>
    <OutlineToolbar {...toolbar} />
    <OutlineTree root={root} selectedId={selectedId} issues={issues} onSelect={onSelect} />
  </>
);
