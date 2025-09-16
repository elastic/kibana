/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { EuiBasicTableColumn, EuiTableSelectionType } from '@elastic/eui';
import {
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiNotificationBadge,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { uniqBy } from 'lodash';

import { AGENT_FIELDS_TO_EXPORT, INITIAL_AGENT_FIELDS_TO_EXPORT } from './columns';

export interface ExportField {
  field: string;
}

export interface ExportFieldWithDescription extends ExportField {
  description: string;
}

interface Props {
  onClose: () => void;
  onSubmit: (columns: ExportField[]) => void;
  agentCount: number;
}

export const AgentExportCSVModal: React.FunctionComponent<Props> = ({
  onClose,
  onSubmit,
  agentCount,
}) => {
  const [selection, setSelection] = useState<ExportFieldWithDescription[]>(
    INITIAL_AGENT_FIELDS_TO_EXPORT
  );

  const modalTitleId = useGeneratedHtmlId();

  const items = uniqBy([...INITIAL_AGENT_FIELDS_TO_EXPORT, ...AGENT_FIELDS_TO_EXPORT], 'field');

  const columns: Array<EuiBasicTableColumn<ExportFieldWithDescription>> = [
    {
      field: 'field',
      name: 'Field',
      truncateText: true,
    },
    {
      field: 'description',
      name: 'Description',
      truncateText: true,
    },
  ];

  const selectionValue: EuiTableSelectionType<ExportFieldWithDescription> = {
    selectable: () => true,
    onSelectionChange: (newSelection) => {
      setSelection(newSelection);
    },
    initialSelected: INITIAL_AGENT_FIELDS_TO_EXPORT,
  };

  return (
    <EuiConfirmModal
      data-test-subj="agentExportCSVModal"
      confirmButtonDisabled={selection.length === 0}
      title={
        <FormattedMessage
          id="xpack.fleet.exportCSV.modalTitle"
          defaultMessage="Download table results as a CSV file"
        />
      }
      aria-labelledby={modalTitleId}
      titleProps={{ id: modalTitleId }}
      onCancel={onClose}
      onConfirm={() => onSubmit(selection.map((s) => ({ field: s.field })))}
      cancelButtonText={
        <FormattedMessage id="xpack.fleet.exportCSV.cancelButtonLabel" defaultMessage="Cancel" />
      }
      confirmButtonText={
        <FormattedMessage
          id="xpack.fleet.exportCSV.confirmButtonLabel"
          defaultMessage="Download CSV"
        />
      }
    >
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiText color="subdued">
                <FormattedMessage
                  id="xpack.fleet.exportCSV.agentsCountText"
                  defaultMessage="Agents"
                />
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiNotificationBadge color="subdued" size="m">
                {agentCount}
              </EuiNotificationBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiSpacer size="s" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText>
            <FormattedMessage
              id="xpack.fleet.exportCSV.modalTableDescription"
              defaultMessage="Select the table columns to display in the CSV file"
            />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiInMemoryTable
            tableCaption="Column"
            items={items}
            itemId="field"
            columns={columns}
            selection={selectionValue}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiConfirmModal>
  );
};
