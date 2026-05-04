/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import { EuiButtonEmpty, EuiIcon, EuiPopover, EuiSelectable } from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useConnectors } from '../../hooks/use_connectors';
import { getConnectorIcon } from '../../utils/connector_display';

interface AddModelPopoverProps {
  existingEndpointIds: string[];
  onAdd: (endpointId: string) => void;
  panelWidth?: number;
}

export const AddModelPopover: React.FC<AddModelPopoverProps> = ({
  existingEndpointIds,
  onAdd,
  panelWidth,
}) => {
  const { data: connectors = [] } = useConnectors();
  const [isOpen, setIsOpen] = useState(false);

  const options: EuiSelectableOption[] = useMemo(() => {
    const existingSet = new Set(existingEndpointIds);
    const available = connectors.filter((connector) => !existingSet.has(connector.connectorId));

    const nameToCount = connectors.reduce<Map<string, number>>((acc, connector) => {
      acc.set(connector.name, (acc.get(connector.name) ?? 0) + 1);
      return acc;
    }, new Map());

    return available.map((connector) => {
      const count = nameToCount.get(connector.name) ?? 1;
      const label = count > 1 ? `${connector.name} (${connector.connectorId})` : connector.name;
      return {
        label,
        key: connector.connectorId,
        prepend: <EuiIcon type={getConnectorIcon(connector)} size="s" aria-hidden />,
      };
    });
  }, [connectors, existingEndpointIds]);

  const handleChange = useCallback(
    (newOptions: EuiSelectableOption[]) => {
      const selected = newOptions.find((opt) => opt.checked === 'on');
      if (selected?.key) {
        onAdd(selected.key);
        setIsOpen(false);
      }
    },
    [onAdd]
  );

  return (
    <EuiPopover
      button={
        <EuiButtonEmpty
          iconType="plusInCircle"
          onClick={() => setIsOpen((prev) => !prev)}
          size="s"
          data-test-subj="add-model-button"
          color="text"
        >
          <FormattedMessage
            id="xpack.searchInferenceEndpoints.settings.addModel"
            defaultMessage="Add a model"
          />
        </EuiButtonEmpty>
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="s"
      anchorPosition="downLeft"
      panelProps={
        panelWidth
          ? {
              css: css`
                width: ${panelWidth}px;
              `,
            }
          : undefined
      }
    >
      <EuiSelectable
        options={options}
        onChange={handleChange}
        singleSelection
        searchable
        searchProps={{
          placeholder: i18n.translate('xpack.searchInferenceEndpoints.settings.addModel.search', {
            defaultMessage: 'Search models...',
          }),
          'data-test-subj': 'add-model-search',
        }}
        listProps={{ bordered: false, showIcons: false }}
        height={300}
      >
        {(list, search) => (
          <>
            {search}
            {list}
          </>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
};
