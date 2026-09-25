/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonIcon,
  EuiCode,
  EuiConfirmModal,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiInMemoryTable,
  EuiPanel,
  EuiPopover,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { RegexAnonymizationRule } from '@kbn/inference-common';

interface CustomPatternsTableProps {
  patterns: RegexAnonymizationRule[];
  onToggle: (id: string, enabled: boolean) => void;
  onEdit: (pattern: RegexAnonymizationRule) => void;
  onDelete: (id: string) => void;
  onAddClick: () => void;
  isSavingEnabled: boolean;
}

interface RowActionsMenuProps {
  pattern: RegexAnonymizationRule;
  onEdit: (pattern: RegexAnonymizationRule) => void;
  onRequestDelete: (pattern: RegexAnonymizationRule) => void;
  isSavingEnabled: boolean;
}

const RowActionsMenu: React.FC<RowActionsMenuProps> = ({
  pattern,
  onEdit,
  onRequestDelete,
  isSavingEnabled,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const ariaLabel = i18n.translate('xpack.aiAnonymizationSettings.customPatterns.table.actions', {
    defaultMessage: 'Actions',
  });

  return (
    <EuiPopover
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="downRight"
      panelPaddingSize="none"
      aria-label={ariaLabel}
      button={
        <EuiToolTip content={ariaLabel} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="ellipsis"
            aria-label={ariaLabel}
            isDisabled={!isSavingEnabled}
            onClick={() => setIsOpen((open) => !open)}
            data-test-subj={`aiAnonymizationSettingsCustomActions-${pattern.id}`}
          />
        </EuiToolTip>
      }
    >
      <EuiContextMenuPanel
        items={[
          <EuiContextMenuItem
            key="edit"
            icon="pencil"
            onClick={() => {
              setIsOpen(false);
              onEdit(pattern);
            }}
            data-test-subj={`aiAnonymizationSettingsCustomEdit-${pattern.id}`}
          >
            <FormattedMessage
              id="xpack.aiAnonymizationSettings.customPatterns.table.editAction"
              defaultMessage="Edit"
            />
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            key="delete"
            icon="trash"
            onClick={() => {
              setIsOpen(false);
              onRequestDelete(pattern);
            }}
            data-test-subj={`aiAnonymizationSettingsCustomDelete-${pattern.id}`}
          >
            <FormattedMessage
              id="xpack.aiAnonymizationSettings.customPatterns.table.deleteAction"
              defaultMessage="Delete"
            />
          </EuiContextMenuItem>,
        ]}
      />
    </EuiPopover>
  );
};

export const CustomPatternsTable: React.FC<CustomPatternsTableProps> = ({
  patterns,
  onToggle,
  onEdit,
  onDelete,
  onAddClick,
  isSavingEnabled,
}) => {
  const [patternPendingDelete, setPatternPendingDelete] = useState<
    RegexAnonymizationRule | undefined
  >();
  const deleteModalTitleId = useGeneratedHtmlId();

  const columns: Array<EuiBasicTableColumn<RegexAnonymizationRule>> = [
    {
      field: 'enabled',
      name: i18n.translate('xpack.aiAnonymizationSettings.customPatterns.table.enable', {
        defaultMessage: 'Enable',
      }),
      width: '80px',
      render: (enabled: boolean, item: RegexAnonymizationRule) => (
        <EuiSwitch
          showLabel={false}
          label=""
          checked={enabled}
          disabled={!isSavingEnabled}
          onChange={(e) => item.id && onToggle(item.id, e.target.checked)}
          data-test-subj={`aiAnonymizationSettingsCustomToggle-${item.id}`}
        />
      ),
    },
    {
      field: 'name',
      name: i18n.translate('xpack.aiAnonymizationSettings.customPatterns.table.name', {
        defaultMessage: 'Name',
      }),
    },
    {
      field: 'entityClass',
      name: i18n.translate('xpack.aiAnonymizationSettings.customPatterns.table.entityType', {
        defaultMessage: 'Entity type',
      }),
      render: (entityClass: string) => <EuiBadge color="hollow">{entityClass}</EuiBadge>,
    },
    {
      field: 'pattern',
      name: i18n.translate('xpack.aiAnonymizationSettings.customPatterns.table.pattern', {
        defaultMessage: 'Pattern',
      }),
      render: (pattern: string) => <EuiCode>{pattern}</EuiCode>,
      truncateText: true,
    },
    {
      name: i18n.translate('xpack.aiAnonymizationSettings.customPatterns.table.actions', {
        defaultMessage: 'Actions',
      }),
      width: '60px',
      render: (item: RegexAnonymizationRule) => (
        <RowActionsMenu
          pattern={item}
          onEdit={onEdit}
          onRequestDelete={setPatternPendingDelete}
          isSavingEnabled={isSavingEnabled}
        />
      ),
    },
  ];

  return (
    <>
      <EuiPanel color="subdued" paddingSize="m" hasShadow={false} borderRadius="m">
        <EuiText size="s" color="subdued">
          <FormattedMessage
            id="xpack.aiAnonymizationSettings.customPatterns.introText"
            defaultMessage="Identifiers that are specific to your organization, such as employee IDs, internal account numbers, badge numbers, and case IDs. The built-in types cannot cover these."
          />
        </EuiText>
      </EuiPanel>
      <EuiSpacer size="m" />
      <EuiInMemoryTable
        items={patterns}
        columns={columns}
        search={{
          box: {
            placeholder: i18n.translate(
              'xpack.aiAnonymizationSettings.customPatterns.searchPlaceholder',
              { defaultMessage: 'Search patterns' }
            ),
          },
          toolsRight: [
            <EuiButton
              key="addPattern"
              fill
              iconType="plus"
              onClick={onAddClick}
              isDisabled={!isSavingEnabled}
              data-test-subj="aiAnonymizationSettingsAddPatternButton"
            >
              <FormattedMessage
                id="xpack.aiAnonymizationSettings.customPatterns.addButton"
                defaultMessage="Add pattern"
              />
            </EuiButton>,
          ],
        }}
        pagination={{ initialPageSize: 10, pageSizeOptions: [10, 25, 50] }}
        itemId="id"
        tableCaption={i18n.translate('xpack.aiAnonymizationSettings.customPatterns.tableCaption', {
          defaultMessage: 'Custom anonymization patterns',
        })}
        data-test-subj="aiAnonymizationSettingsCustomPatternsTable"
      />
      {patternPendingDelete && (
        <EuiConfirmModal
          aria-labelledby={deleteModalTitleId}
          titleProps={{ id: deleteModalTitleId }}
          title={i18n.translate('xpack.aiAnonymizationSettings.customPatterns.deleteModalTitle', {
            defaultMessage: 'Delete "{name}"?',
            values: { name: patternPendingDelete.name },
          })}
          onCancel={() => setPatternPendingDelete(undefined)}
          onConfirm={() => {
            if (patternPendingDelete.id) {
              onDelete(patternPendingDelete.id);
            }
            setPatternPendingDelete(undefined);
          }}
          cancelButtonText={i18n.translate(
            'xpack.aiAnonymizationSettings.customPatterns.deleteModalCancel',
            { defaultMessage: 'Cancel' }
          )}
          confirmButtonText={i18n.translate(
            'xpack.aiAnonymizationSettings.customPatterns.deleteModalConfirm',
            { defaultMessage: 'Delete' }
          )}
          buttonColor="danger"
          data-test-subj="aiAnonymizationSettingsDeleteConfirmModal"
        >
          <FormattedMessage
            id="xpack.aiAnonymizationSettings.customPatterns.deleteModalBody"
            defaultMessage="This pattern will stop being applied immediately. This action cannot be undone."
          />
        </EuiConfirmModal>
      )}
    </>
  );
};
