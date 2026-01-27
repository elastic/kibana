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
  EuiButtonIcon,
  EuiContextMenu,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';
import type { Template } from './sample_data';
import { FormattedRelativePreferenceDate } from '../formatted_date';
import { getEmptyCellValue } from '../empty_value';
import * as i18n from '../templates/translations';

type TemplatesColumns =
  | EuiTableActionsColumnType<Template>
  | EuiTableComputedColumnType<Template>
  | EuiTableFieldDataColumnType<Template>;

const LINE_CLAMP = 3;
const getLineClampedCss = css`
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: ${LINE_CLAMP};
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: normal;
`;

const SOLUTION_LABELS: Record<Template['solution'], string> = {
  security: 'Security',
  observability: 'Observability',
  other: 'Other',
};

const SOLUTION_ICONS: Record<Template['solution'], string> = {
  security: 'logoSecurity',
  observability: 'logoObservability',
  other: 'logoKibana',
};

interface ActionColumnProps {
  template: Template;
  onEdit: (template: Template) => void;
  onClone: (template: Template) => void;
  onSetAsDefault: (template: Template) => void;
  onExport: (template: Template) => void;
  onPreview: (template: Template) => void;
  onDelete: (template: Template) => void;
  disableActions?: boolean;
}

const ActionColumnComponent: React.FC<ActionColumnProps> = ({
  template,
  onEdit,
  onClone,
  onSetAsDefault,
  onExport,
  onPreview,
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

  const handlePreview = useCallback(() => {
    closePopover();
    onPreview(template);
  }, [closePopover, onPreview, template]);

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
            'data-test-subj': `template-action-edit-${template.key}`,
          },
          {
            name: i18n.CLONE_TEMPLATE,
            icon: 'copy',
            onClick: handleClone,
            'data-test-subj': `template-action-clone-${template.key}`,
          },
          {
            name: i18n.SET_AS_DEFAULT_TEMPLATE,
            icon: 'check',
            onClick: handleSetAsDefault,
            'data-test-subj': `template-action-set-default-${template.key}`,
          },
          {
            name: i18n.EXPORT_TEMPLATE,
            icon: 'exportAction',
            onClick: handleExport,
            'data-test-subj': `template-action-export-${template.key}`,
          },
          {
            isSeparator: true,
          },
          {
            name: i18n.PREVIEW_TEMPLATE,
            icon: 'eye',
            onClick: handlePreview,
            'data-test-subj': `template-action-preview-${template.key}`,
          },
          {
            name: i18n.DELETE_TEMPLATE,
            icon: 'trash',
            onClick: handleDelete,
            'data-test-subj': `template-action-delete-${template.key}`,
          },
        ],
      },
    ],
    [
      handleEdit,
      handleClone,
      handleSetAsDefault,
      handleExport,
      handlePreview,
      handleDelete,
      template.key,
    ]
  );

  return (
    <EuiPopover
      id={`template-action-popover-${template.key}`}
      button={
        <EuiButtonIcon
          onClick={togglePopover}
          iconType="boxesHorizontal"
          aria-label={i18n.ACTIONS}
          color="text"
          data-test-subj={`template-action-popover-button-${template.key}`}
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
        data-test-subj={`template-action-menu-${template.key}`}
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
  onPreview: (template: Template) => void;
  onDelete: (template: Template) => void;
  disableActions?: boolean;
}

export interface UseTemplatesColumnsReturnValue {
  columns: TemplatesColumns[];
}

export const useTemplatesColumns = ({
  onEdit,
  onClone,
  onSetAsDefault,
  onExport,
  onPreview,
  onDelete,
  disableActions = false,
}: UseTemplatesColumnsProps): UseTemplatesColumnsReturnValue => {
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
                  <EuiBadge data-test-subj="template-column-default-badge">{i18n.DEFAULT}</EuiBadge>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          ) : (
            getEmptyCellValue()
          ),
        width: '15%',
      },
      {
        field: 'description',
        name: i18n.COLUMN_DESCRIPTION,
        sortable: false,
        render: (description: string) =>
          description ? (
            <EuiToolTip content={description}>
              <span css={getLineClampedCss} data-test-subj="template-column-description">
                {description}
              </span>
            </EuiToolTip>
          ) : (
            getEmptyCellValue()
          ),
        width: '22%',
      },
      {
        field: 'solution',
        name: i18n.COLUMN_SOLUTION,
        sortable: true,
        render: (solution: Template['solution']) =>
          solution ? (
            <EuiFlexGroup
              gutterSize="s"
              alignItems="center"
              responsive={false}
              data-test-subj="template-column-solution"
            >
              <EuiFlexItem grow={false}>
                <EuiIcon type={SOLUTION_ICONS[solution]} size="m" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>{SOLUTION_LABELS[solution]}</EuiFlexItem>
            </EuiFlexGroup>
          ) : (
            getEmptyCellValue()
          ),
        width: '12%',
      },
      {
        field: 'fields',
        name: i18n.COLUMN_FIELDS,
        sortable: true,
        render: (fields: number) =>
          fields != null ? (
            <span data-test-subj="template-column-fields">{fields}</span>
          ) : (
            getEmptyCellValue()
          ),
        width: '5%',
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
                gutterSize="xs"
              >
                {tags.map((tag: string, i: number) => (
                  <EuiBadge
                    css={css`
                      max-width: 100px;
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
              <EuiBadgeGroup data-test-subj="template-column-tags-tooltip-content">
                {tags.map((tag: string, i: number) => (
                  <EuiBadge color="hollow" key={`${tag}-${i}`}>
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
        field: 'lastUpdate',
        name: i18n.COLUMN_LAST_UPDATE,
        sortable: true,
        render: (lastUpdate: string) =>
          lastUpdate ? (
            <span data-test-subj="template-column-lastUpdate">
              <FormattedRelativePreferenceDate value={lastUpdate} />
            </span>
          ) : (
            getEmptyCellValue()
          ),
        width: '11%',
      },
      {
        field: 'lastTimeUsed',
        name: i18n.COLUMN_LAST_TIME_USED,
        sortable: true,
        render: (lastTimeUsed: string) =>
          lastTimeUsed ? (
            <span data-test-subj="template-column-lastTimeUsed">
              <FormattedRelativePreferenceDate value={lastTimeUsed} />
            </span>
          ) : (
            getEmptyCellValue()
          ),
        width: '11%',
      },
      {
        field: 'usage',
        name: i18n.COLUMN_USAGE,
        sortable: true,
        render: (usage: number) =>
          usage != null ? (
            <span data-test-subj="template-column-usage">
              {usage} {usage === 1 ? i18n.CASE : i18n.CASES}
            </span>
          ) : (
            getEmptyCellValue()
          ),
        width: '6%',
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
            onPreview={onPreview}
            onDelete={onDelete}
            disableActions={disableActions}
          />
        ),
        width: '80px',
      },
    ],
    [onEdit, onClone, onSetAsDefault, onExport, onPreview, onDelete, disableActions]
  );

  return { columns };
};
