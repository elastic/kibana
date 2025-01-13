/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiFlexItem, EuiFormRow, EuiLink, EuiSuperSelect, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { LoadConnectorResult } from '../gen_ai_streaming_response_example';

export interface ListConnectorsProps {
  connectors: LoadConnectorResult[];
  setIsConnectorModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
  onConnectorSelect: React.Dispatch<React.SetStateAction<string>>;
}

export const ListConnectors = ({
  connectors,
  onConnectorSelect,
  setIsConnectorModalVisible,
}: ListConnectorsProps) => {
  const [value, setValue] = useState<string>();
  const connectorOptions = useMemo(() => {
    return (
      connectors.map((connector) => {
        return {
          value: connector.id,
          inputDisplay: connector.name,
          dropdownDisplay: (
            <React.Fragment key={connector.id}>
              <strong>{connector.name}</strong>
            </React.Fragment>
          ),
        };
      }) ?? []
    );
  }, [connectors]);

  const onSelectConnector = useCallback(
    (v: string) => {
      setValue(v);
      onConnectorSelect(v);
    },
    [onConnectorSelect]
  );
  return (
    <>
      <EuiFlexItem>
        <EuiFormRow
          label={i18n.translate(
            'genAiStreamingResponseExample.app.component.selectConnectorLabel',
            {
              defaultMessage: 'Select an OpenAI Connector',
            }
          )}
          labelAppend={
            <EuiText size="xs">
              <EuiLink onClick={() => setIsConnectorModalVisible(true)}>
                {i18n.translate(
                  'genAiStreamingResponseExample.app.component.selectConnectorLabelAppend',
                  {
                    defaultMessage: 'or add another',
                  }
                )}
              </EuiLink>
            </EuiText>
          }
        >
          <EuiSuperSelect
            valueOfSelected={value}
            options={connectorOptions}
            onChange={onSelectConnector}
          />
        </EuiFormRow>
      </EuiFlexItem>
    </>
  );
};
