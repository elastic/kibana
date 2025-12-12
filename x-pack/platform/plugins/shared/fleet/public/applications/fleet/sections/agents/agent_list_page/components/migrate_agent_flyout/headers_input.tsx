/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldText,
  EuiButtonEmpty,
  EuiFormRow,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

interface HeadersInputProps {
  headers: Record<string, string>;
  onUpdate: (headers: Record<string, string>) => void;
}

export const HeadersInput: React.FC<HeadersInputProps> = ({ headers, onUpdate }) => {
  const addEmptyHeader = () => {
    onUpdate({
      ...headers,
      '': '',
    });
  };

  const replaceKeyOrValue = useCallback(
    (index: number, keyOrValue: string, updateType: 'key' | 'value') => {
      const entries = Object.entries(headers);

      if (updateType === 'key') {
        const updatedEntries = entries.map((entry, i) =>
          i === index ? [keyOrValue, entry[1]] : entry
        );
        onUpdate(Object.fromEntries(updatedEntries));
      } else {
        const updatedEntries = entries.map((entry, i) =>
          i === index ? [entry[0], keyOrValue] : entry
        );
        onUpdate(Object.fromEntries(updatedEntries));
      }
    },
    [headers, onUpdate]
  );

  return (
    <>
      {headers &&
        Object.entries(headers).map(([key, value], index) => {
          return (
            <>
              <EuiFlexGroup>
                <EuiFlexItem grow={5}>
                  <EuiFieldText
                    placeholder={i18n.translate(
                      'xpack.fleet.agentList.migrateAgentFlyout.headersKeyPlaceholder',
                      {
                        defaultMessage: 'Key',
                      }
                    )}
                    onChange={(e) => {
                      replaceKeyOrValue(index, e.target.value, 'key');
                    }}
                    value={key}
                    fullWidth
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={5}>
                  <EuiFieldText
                    value={value}
                    placeholder={i18n.translate(
                      'xpack.fleet.agentList.migrateAgentFlyout.headersValuePlaceholder',
                      {
                        defaultMessage: 'Value',
                      }
                    )}
                    onChange={(e) => {
                      replaceKeyOrValue(index, e.target.value, 'value');
                    }}
                    fullWidth
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={0}>
                  <EuiButtonEmpty
                    iconType="cross"
                    onClick={() => {
                      // Get all entries from headers
                      const entries = Object.entries(headers);
                      // Filter out the entry at the specified index
                      const updatedEntries = entries.filter((_, i) => i !== index);
                      // Convert back to object and update the form state
                      onUpdate(Object.fromEntries(updatedEntries));
                    }}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="m" />
            </>
          );
        })}

      <EuiFormRow>
        <EuiButtonEmpty
          iconType="plusInCircle"
          onClick={() => {
            addEmptyHeader();
          }}
        >
          <FormattedMessage
            id="xpack.fleet.agentList.migrateAgentFlyout.addHeaderLabel"
            defaultMessage="Add Row"
          />
        </EuiButtonEmpty>
      </EuiFormRow>
    </>
  );
};
