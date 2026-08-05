/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiIconTip,
  EuiPopover,
} from '@elastic/eui';
import { BULK_FILTER_MAX_RESOURCES } from '@kbn/alerting-v2-schemas';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

export interface RulesBulkActionsProps {
  selectedCount: number;
  totalItemCount: number;
  isAllSelected: boolean;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBulkEnable: () => void;
  onBulkDisable: () => void;
  onBulkDelete: () => void;
}

/**
 * Bulk-action toolbar for the rules list: selected-count menu, cross-page
 * "Select all {N} rules", and clear selection. Returns null when nothing is
 * selected. Driven entirely by props so it can sit above either the current
 * EuiBasicTable or a future Content List table.
 */
export const RulesBulkActions: React.FC<RulesBulkActionsProps> = ({
  selectedCount,
  totalItemCount,
  isAllSelected,
  onSelectAll,
  onClearSelection,
  onBulkEnable,
  onBulkDisable,
  onBulkDelete,
}) => {
  const [isBulkActionsOpen, setIsBulkActionsOpen] = useState(false);

  if (selectedCount === 0) {
    return null;
  }

  const handleBulkEnable = () => {
    setIsBulkActionsOpen(false);
    onBulkEnable();
  };

  const handleBulkDisable = () => {
    setIsBulkActionsOpen(false);
    onBulkDisable();
  };

  const handleBulkDelete = () => {
    setIsBulkActionsOpen(false);
    onBulkDelete();
  };

  return (
    <>
      <EuiFlexItem grow={false}>
        <EuiPopover
          button={
            <EuiButtonEmpty
              size="xs"
              iconType="arrowDown"
              iconSide="right"
              onClick={() => setIsBulkActionsOpen((open) => !open)}
              data-test-subj="bulkActionsButton"
            >
              <FormattedMessage
                id="xpack.alertingV2.rulesList.selectedCount"
                defaultMessage="{count} Selected"
                values={{ count: selectedCount }}
              />
            </EuiButtonEmpty>
          }
          isOpen={isBulkActionsOpen}
          closePopover={() => setIsBulkActionsOpen(false)}
          panelPaddingSize="none"
          anchorPosition="downLeft"
          aria-label={i18n.translate('xpack.alertingV2.rulesList.bulkAction.menu', {
            defaultMessage: 'Bulk actions',
          })}
        >
          <EuiContextMenuPanel
            items={[
              <EuiContextMenuItem
                key="enable"
                icon={<EuiIcon type="checkCircle" size="m" aria-hidden={true} />}
                onClick={handleBulkEnable}
                data-test-subj="bulkEnableRules"
              >
                {i18n.translate('xpack.alertingV2.rulesList.bulkAction.enable', {
                  defaultMessage: 'Enable',
                })}
              </EuiContextMenuItem>,
              <EuiContextMenuItem
                key="disable"
                icon={<EuiIcon type="crossInCircle" size="m" aria-hidden={true} />}
                onClick={handleBulkDisable}
                data-test-subj="bulkDisableRules"
              >
                {i18n.translate('xpack.alertingV2.rulesList.bulkAction.disable', {
                  defaultMessage: 'Disable',
                })}
              </EuiContextMenuItem>,
              <EuiContextMenuItem
                key="delete"
                icon={<EuiIcon type="trash" size="m" color="danger" aria-hidden={true} />}
                onClick={handleBulkDelete}
                data-test-subj="bulkDeleteRules"
              >
                {i18n.translate('xpack.alertingV2.rulesList.bulkAction.delete', {
                  defaultMessage: 'Delete',
                })}
              </EuiContextMenuItem>,
            ]}
          />
        </EuiPopover>
      </EuiFlexItem>
      {!isAllSelected ? (
        // Above the cap, bulk-by-query rejects the whole request
        // (all-or-nothing), so cross-page "select all" is disabled rather
        // than hidden — a help tip explains why and how to proceed.
        // Explicit per-page/row selection stays available regardless.
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="xs"
                iconType="pagesSelect"
                onClick={onSelectAll}
                isDisabled={totalItemCount > BULK_FILTER_MAX_RESOURCES}
                data-test-subj="selectAllRulesButton"
              >
                <FormattedMessage
                  id="xpack.alertingV2.rulesList.selectAll"
                  defaultMessage="Select all {total} {total, plural, one {rule} other {rules}}"
                  values={{ total: totalItemCount }}
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
            {totalItemCount > BULK_FILTER_MAX_RESOURCES ? (
              <EuiFlexItem grow={false}>
                <EuiIconTip
                  type="question"
                  color="subdued"
                  position="top"
                  anchorProps={{ 'data-test-subj': 'bulkSelectAllLimitTooltip' }}
                  aria-label={i18n.translate(
                    'xpack.alertingV2.rulesList.bulkSelectAllLimitAriaLabel',
                    { defaultMessage: 'Why is Select all disabled?' }
                  )}
                  content={
                    <span data-test-subj="bulkSelectAllLimitDisclosure">
                      <FormattedMessage
                        id="xpack.alertingV2.rulesList.bulkSelectAllLimitDisclosure"
                        defaultMessage="Select all is available only when {maxRules, number} or fewer rules match. Narrow your filter to select every matching rule."
                        values={{ maxRules: BULK_FILTER_MAX_RESOURCES }}
                      />
                    </span>
                  }
                />
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </EuiFlexItem>
      ) : null}
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          size="xs"
          iconType="cross"
          color="danger"
          onClick={onClearSelection}
          data-test-subj="clearSelectionButton"
        >
          <FormattedMessage
            id="xpack.alertingV2.rulesList.clearSelection"
            defaultMessage="Clear selection"
          />
        </EuiButtonEmpty>
      </EuiFlexItem>
    </>
  );
};
