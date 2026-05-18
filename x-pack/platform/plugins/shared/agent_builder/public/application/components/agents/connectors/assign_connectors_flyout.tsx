/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiHighlight,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import type { ConnectorItem } from '../../../../../common/http_api/tools';
import { useUpdateAgent } from '../../../hooks/connectors/use_update_agent';
import { useKibana } from '../../../hooks/use_kibana';
import { labels } from '../../../utils/i18n';
import { ConnectorTypeIcon } from '../../connectors/connector_type_icon';

type ConnectorOption = EuiComboBoxOptionOption<ConnectorItem>;

interface AssignConnectorsFlyoutProps {
  agentId: string;
  connectors: readonly ConnectorItem[];
  selectedIds: string[];
  onClose: () => void;
}

export const AssignConnectorsFlyout = ({
  agentId,
  connectors,
  selectedIds,
  onClose,
}: AssignConnectorsFlyoutProps) => {
  const titleId = useGeneratedHtmlId({ prefix: 'assignConnectorsFlyout' });
  const { updateAgent, isLoading } = useUpdateAgent({ agentId, onSuccess: onClose });
  const [selected, setSelected] = useState<ConnectorOption[]>([]);
  const {
    services: {
      plugins: { triggersActionsUi },
    },
  } = useKibana();
  const { actionTypeRegistry } = triggersActionsUi;

  const options: ConnectorOption[] = useMemo(
    () =>
      connectors
        .filter((c) => !selectedIds.includes(c.id))
        .map((c) => ({ label: c.name, value: c, key: c.id })),
    [connectors, selectedIds]
  );

  const renderOption = useCallback(
    (option: ConnectorOption, searchValue: string) => {
      const connector = option.value!;
      const typeName = actionTypeRegistry.has(connector.actionTypeId)
        ? actionTypeRegistry.get(connector.actionTypeId).actionTypeTitle ?? connector.actionTypeId
        : connector.actionTypeId;

      return (
        <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
          <EuiFlexItem>
            <EuiHighlight search={searchValue}>{connector.name}</EuiHighlight>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <ConnectorTypeIcon actionTypeId={connector.actionTypeId} />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {typeName}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    },
    [actionTypeRegistry]
  );

  return (
    <EuiFlyout onClose={onClose} aria-labelledby={titleId} size="s">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={titleId}>{labels.connectors.addExistingConnectorFlyoutTitle}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiComboBox
          aria-label={labels.connectors.addExistingConnectorFlyoutTitle}
          placeholder={labels.connectors.chooseConnectorPlaceholder}
          fullWidth
          singleSelection={{ asPlainText: true }}
          options={options}
          selectedOptions={selected}
          onChange={setSelected}
          renderOption={renderOption}
          rowHeight={48}
        />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiButtonEmpty onClick={onClose}>{labels.connectors.cancelButtonLabel}</EuiButtonEmpty>
          <EuiButton
            fill
            isLoading={isLoading}
            isDisabled={selected.length === 0 || isLoading}
            onClick={() => {
              const connector = selected[0].value;
              if (!connector) return;
              updateAgent({ connector_ids: [...selectedIds, connector.id] });
            }}
          >
            {labels.connectors.assignButtonLabel}
          </EuiButton>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
