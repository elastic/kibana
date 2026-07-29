/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiHorizontalRule,
  EuiSelectable,
  EuiSkeletonText,
  EuiSpacer,
} from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo } from 'react';
import { useKibana } from '../../hooks/use_kibana';
import type { DataConnector } from '../../hooks/use_data_connectors';

const MANAGEMENT_APP_ID = 'management';
const CONNECTORS_MANAGEMENT_PATH = '/insightsAndAlerting/triggersActionsConnectors/connectors';

interface ConnectorsTabProps {
  connectors: DataConnector[];
  isLoading: boolean;
  isError: boolean;
  selectedConnectorIds: string[];
  onToggle: (params: { id: string; name: string; checked: boolean }) => void;
}

export const ConnectorsTab = ({
  connectors,
  isLoading,
  isError,
  selectedConnectorIds,
  onToggle,
}: ConnectorsTabProps) => {
  const {
    services: { application },
  } = useKibana();

  const selectedIds = useMemo(() => new Set(selectedConnectorIds), [selectedConnectorIds]);

  const options = useMemo<EuiSelectableOption[]>(
    () =>
      connectors.map((connector) => ({
        key: connector.id,
        label: connector.name,
        checked: selectedIds.has(connector.id) ? 'on' : undefined,
        'data-test-subj': `contextConnectorOption-${connector.id}`,
      })),
    [connectors, selectedIds]
  );

  const handleChange = (
    _options: EuiSelectableOption[],
    _event: unknown,
    changedOption: EuiSelectableOption
  ) => {
    if (!changedOption.key) {
      return;
    }
    onToggle({
      id: changedOption.key,
      name: changedOption.label,
      checked: changedOption.checked === 'on',
    });
  };

  const createConnectorButton = (
    <EuiButtonEmpty
      iconType="plusInCircle"
      onClick={() =>
        application.navigateToApp(MANAGEMENT_APP_ID, { path: CONNECTORS_MANAGEMENT_PATH })
      }
      data-test-subj="contextCreateConnectorButton"
    >
      <FormattedMessage
        id="xpack.contextEngine.sourcePicker.connectors.createButton"
        defaultMessage="Create a connector"
      />
    </EuiButtonEmpty>
  );

  if (isLoading) {
    return <EuiSkeletonText lines={3} data-test-subj="contextConnectorsLoading" />;
  }

  if (isError) {
    return (
      <EuiEmptyPrompt
        color="danger"
        iconType="error"
        data-test-subj="contextConnectorsError"
        title={
          <h3>
            <FormattedMessage
              id="xpack.contextEngine.sourcePicker.connectors.errorTitle"
              defaultMessage="Unable to load connectors"
            />
          </h3>
        }
        body={
          <p>
            <FormattedMessage
              id="xpack.contextEngine.sourcePicker.connectors.errorBody"
              defaultMessage="Connectors could not be loaded. Try again or check your permissions."
            />
          </p>
        }
      />
    );
  }

  if (connectors.length === 0) {
    return (
      <EuiEmptyPrompt
        iconType="plugs"
        titleSize="xs"
        data-test-subj="contextConnectorsEmpty"
        title={
          <h3>
            <FormattedMessage
              id="xpack.contextEngine.sourcePicker.connectors.emptyTitle"
              defaultMessage="No connectors yet"
            />
          </h3>
        }
        body={
          <p>
            <FormattedMessage
              id="xpack.contextEngine.sourcePicker.connectors.emptyBody"
              defaultMessage="Create a connector in this space to use it as a source."
            />
          </p>
        }
        actions={createConnectorButton}
      />
    );
  }

  return (
    <div data-test-subj="contextConnectorsTab">
      <EuiSelectable
        aria-label={i18n.translate('xpack.contextEngine.sourcePicker.connectors.listAriaLabel', {
          defaultMessage: 'Select connectors to use as sources',
        })}
        searchable
        options={options}
        onChange={handleChange}
        height={240}
        listProps={{ bordered: true, isVirtualized: false, onFocusBadge: false }}
        data-test-subj="contextConnectorsSelectable"
      >
        {(list, search) => (
          <>
            {search}
            <EuiSpacer size="s" />
            {list}
          </>
        )}
      </EuiSelectable>
      <EuiHorizontalRule margin="m" />
      {createConnectorButton}
    </div>
  );
};
