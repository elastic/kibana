/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import type {
  EuiTableActionsColumnType,
  EuiTableComputedColumnType,
  EuiTableFieldDataColumnType,
  EuiContextMenuPanelDescriptor,
} from '@elastic/eui';
import {
  EuiBadgeGroup,
  EuiBadge,
  EuiBeacon,
  EuiButtonIcon,
  EuiContextMenu,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPopover,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import type { Template } from '../../../../common/types/domain/template/v1';
import type { TemplateListItem } from '../../../../common/types/api/template/v1';
import { FormattedRelativePreferenceDate } from '../../formatted_date';
import { getEmptyCellValue } from '../../empty_value';
import * as i18n from '../../templates/translations';
import { LINE_CLAMP } from '../constants';

type TemplatesColumns =
  | EuiTableActionsColumnType<TemplateListItem>
  | EuiTableComputedColumnType<TemplateListItem>
  | EuiTableFieldDataColumnType<TemplateListItem>;

const getLineClampedCss = css`
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: ${LINE_CLAMP};
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: normal;
`;

interface ActionColumnProps {
  template: Template;
  onEdit: (template: Template) => void;
  onClone: (template: Template) => void;
  onSetAsDefault: (template: Template) => void;
  onExport: (template: Template) => void;
  onDelete: (template: Template) => void;
  disableActions?: boolean;
}

const ActionColumnComponent: React.FC<ActionColumnProps> = ({
  template,
  onEdit,
  onClone,
  onSetAsDefault,
  onExport,
  onDelete,
  disableActions = false,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const togglePopover = useCallback(() => setIsPopoverOpen((prev) => !prev), []);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);
  const handleEdit = useCallback(() => {
    closePopover();
    onEdit(template);
  }, [closePopover, onEdit, template]);

  const handleClone = useCallback(() => {
    closePopover();
    onClone(template);
  }, [closePopover, onClone, template]);

  const handleSetAsDefault = useCallback(() => {
    closePopover();
    onSetAsDefault(template);
  }, [closePopover, onSetAsDefault, template]);

  const handleExport = useCallback(() => {
    closePopover();
    onExport(template);
  }, [closePopover, onExport, template]);

  const handleDelete = useCallback(() => {
    closePopover();
    onDelete(template);
  }, [closePopover, onDelete, template]);

  const panels: EuiContextMenuPanelDescriptor[] = useMemo(
    () => [
      {
        id: 0,
        title: i18n.ACTIONS,
        items: [
          {
            name: i18n.EDIT_TEMPLATE,
            icon: 'pencil',
            onClick: handleEdit,
            'data-test-subj': `template-action-edit-${template.templateId}`,
          },
          {
            name: i18n.CLONE_TEMPLATE,
            icon: 'copy',
            onClick: handleClone,
            'data-test-subj': `template-action-clone-${template.templateId}`,
          },
          {
            name: i18n.SET_AS_DEFAULT_TEMPLATE,
            icon: 'check',
            onClick: handleSetAsDefault,
            'data-test-subj': `template-action-set-default-${template.templateId}`,
          },
          {
            name: i18n.EXPORT_TEMPLATE,
            icon: 'exportAction',
            onClick: handleExport,
            'data-test-subj': `template-action-export-${template.templateId}`,
          },
          {
            isSeparator: true,
          },
          {
            name: i18n.DELETE_TEMPLATE,
            icon: 'trash',
            onClick: handleDelete,
            'data-test-subj': `template-action-delete-${template.templateId}`,
          },
        ],
      },
    ],
    [handleEdit, handleClone, handleSetAsDefault, handleExport, handleDelete, template.templateId]
  );

  return (
    <EuiPopover
      id={`template-action-popover-${template.templateId}`}
      button={
        <EuiButtonIcon
          onClick={togglePopover}
          iconType="boxesHorizontal"
          aria-label={i18n.ACTIONS}
          color="text"
          data-test-subj={`template-action-popover-button-${template.templateId}`}
          disabled={disableActions}
        />
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiContextMenu
        initialPanelId={0}
        panels={panels}
        data-test-subj={`template-action-menu-${template.templateId}`}
      />
    </EuiPopover>
  );
};

ActionColumnComponent.displayName = 'ActionColumnComponent';

const ActionColumn = React.memo(ActionColumnComponent);

export interface UseTemplatesColumnsProps {
  onEdit: (template: Template) => void;
  onClone: (template: Template) => void;
  onSetAsDefault: (template: Template) => void;
  onExport: (template: Template) => void;
  onDelete: (template: Template) => void;
  disableActions?: boolean;
}

export const useTemplatesColumns = ({
  onEdit,
  onClone,
  onSetAsDefault,
  onExport,
  onDelete,
  disableActions = false,
}: UseTemplatesColumnsProps) => {
  const { euiTheme } = useEuiTheme();
  const columns: TemplatesColumns[] = useMemo(
    () => [
      {
        field: 'name',
        name: i18n.COLUMN_NAME,
        sortable: true,
        render: (name: string, template: Template) =>
          name ? (
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiLink onClick={() => onEdit(template)} data-test-subj="template-column-name">
                  {name}
                </EuiLink>
              </EuiFlexItem>
              {template.isDefault && (
                <EuiFlexItem grow={false}>
                  <EuiBadge
                    css={css`
                      border-radius: ${euiTheme.border.radius.small};
                    `}
                    data-test-subj="template-column-default-badge"
                  >
                    {i18n.DEFAULT}
                  </EuiBadge>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          ) : (
            getEmptyCellValue()
          ),
        width: '16%',
      },
      {
        field: 'description',
        name: i18n.COLUMN_DESCRIPTION,
        sortable: false,
        render: (description: string) =>
          description ? (
            <EuiToolTip content={description}>
              <span
                tabIndex={0}
                css={getLineClampedCss}
                data-test-subj="template-column-description"
              >
                {description}
              </span>
            </EuiToolTip>
          ) : (
            getEmptyCellValue()
          ),
        width: '24%',
      },
      {
        field: 'fieldCount',
        name: i18n.COLUMN_FIELDS,
        sortable: true,
        align: 'right',
        render: (fieldCount: number | undefined, template: TemplateListItem) => {
          if (fieldCount == null) {
            return getEmptyCellValue();
          }

          const fieldNames = template.fieldNames;
          const content = (
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <span data-test-subj="template-column-fields">{fieldCount}</span>
              </EuiFlexItem>
              {template.fieldSearchMatches && (
                <EuiFlexItem grow={false}>
                  <EuiBeacon
                    data-test-subj="template-column-fields-search-match"
                    size={6}
                    color="subdued"
                  />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          );

          if (fieldNames && fieldNames.length > 0) {
            return (
              <EuiToolTip
                position="top"
                content={
                  <div data-test-subj="template-column-fields-tooltip">
                    {fieldNames.map((name, idx) => (
                      <div key={`${name}-${idx}`}>{name}</div>
                    ))}
                  </div>
                }
              >
                {content}
              </EuiToolTip>
            );
          }

          return content;
        },
        width: '6%',
      },
      {
        field: 'tags',
        name: i18n.COLUMN_TAGS,
        sortable: false,
        render: (tags: string[]) => {
          if (tags != null && tags.length > 0) {
            const clampedBadges = (
              <EuiBadgeGroup
                data-test-subj="template-column-tags"
                css={getLineClampedCss}
                gutterSize="s"
              >
                {tags.map((tag: string, i: number) => (
                  <EuiBadge
                    css={css`
                      max-width: 100px;
                      margin-right: ${euiTheme.size.xs};
                      border-radius: ${euiTheme.border.radius.small};
                    `}
                    color="hollow"
                    key={`${tag}-${i}`}
                    data-test-subj={`template-column-tag-${tag}`}
                  >
                    {tag}
                  </EuiBadge>
                ))}
              </EuiBadgeGroup>
            );

            const unclampedBadges = (
              <EuiBadgeGroup data-test-subj="template-column-tags-tooltip-content" gutterSize="xs">
                {tags.map((tag: string, i: number) => (
                  <EuiBadge
                    css={css`
                      border-radius: ${euiTheme.border.radius.small};
                    `}
                    color="hollow"
                    key={`${tag}-${i}`}
                  >
                    {tag}
                  </EuiBadge>
                ))}
              </EuiBadgeGroup>
            );

            return (
              <EuiToolTip position="left" content={unclampedBadges}>
                {clampedBadges}
              </EuiToolTip>
            );
          }
          return getEmptyCellValue();
        },
        width: '16%',
      },
      {
        field: 'author',
        name: i18n.COLUMN_AUTHOR,
        sortable: true,
        render: (author: string | undefined) =>
          author ? (
            <span data-test-subj="template-column-author">{author}</span>
          ) : (
            getEmptyCellValue()
          ),
        width: '10%',
      },
      {
        field: 'lastUsedAt',
        name: i18n.COLUMN_LAST_TIME_USED,
        sortable: true,
        render: (lastUsedAt: string | undefined) =>
          lastUsedAt ? (
            <span data-test-subj="template-column-lastUsedAt">
              <FormattedRelativePreferenceDate value={lastUsedAt} />
            </span>
          ) : (
            getEmptyCellValue()
          ),
        width: '10%',
      },
      {
        field: 'usageCount',
        name: i18n.COLUMN_USAGE,
        sortable: true,
        render: (usageCount: number | undefined) =>
          usageCount != null ? (
            <span data-test-subj="template-column-usage">
              {usageCount} {usageCount === 1 ? i18n.CASE : i18n.CASES}
            </span>
          ) : (
            getEmptyCellValue()
          ),
        width: '8%',
      },
      {
        name: i18n.ACTIONS,
        align: 'right',
        render: (template: Template) => (
          <ActionColumn
            template={template}
            onEdit={onEdit}
            onClone={onClone}
            onSetAsDefault={onSetAsDefault}
            onExport={onExport}
            onDelete={onDelete}
            disableActions={disableActions}
          />
        ),
        width: '80px',
      },
    ],
    [
      onEdit,
      euiTheme.size.xs,
      euiTheme.border.radius.small,
      onClone,
      onSetAsDefault,
      onExport,
      onDelete,
      disableActions,
    ]
  );

  return { columns };
};
