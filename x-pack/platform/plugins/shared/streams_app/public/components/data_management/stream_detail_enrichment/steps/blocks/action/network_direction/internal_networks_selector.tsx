/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiCheckableCard,
  EuiFlexGroup,
  EuiFormFieldset,
  EuiFormRow,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState, type ReactNode } from 'react';
import { ProcessorFieldSelector } from '../processor_field_selector';

const InternalNetworksContent = () => {
  return (
    <EuiFormRow
      label={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.networkDirectionsSelectorInternalNetworksLabel',
        { defaultMessage: 'Enter IPv4/IPv6 addresses, CIDR ranges, or named ranges.' }
      )}
    >
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiButtonIcon
          iconType="plus"
          display="base"
          color="text"
          onClick={() => {}}
          aria-label={i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.processor.networkDirectionsSelectorInternalNetworksAddButton',
            { defaultMessage: 'Add' }
          )}
        />
      </EuiFlexGroup>
    </EuiFormRow>
  );
};

const InternalNetworksFieldContent = () => (
  <ProcessorFieldSelector
    fieldKey="internal_networks_field"
    label={i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.processor.networkDirectionsSelectorInternalNetworksFieldLabel',
      { defaultMessage: 'Field that contains the list of internal networks.' }
    )}
  />
);

interface InternalNetworksOptions {
  id: string;
  label: string;
  content: ReactNode;
}

const internalNetworksOptions: InternalNetworksOptions[] = [
  {
    id: 'internal_networks',
    label: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.processor.networkDirectionsSelectorInternalNetworksLabel',
      { defaultMessage: 'Define them manually.' }
    ),
    content: <InternalNetworksContent />,
  },
  {
    id: 'internal_networks_field',
    label: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.processor.networkDirectionSelectorInternalNetworksFieldLabel',
      { defaultMessage: 'Read them from a field.' }
    ),
    content: <InternalNetworksFieldContent />,
  },
];

export const InternalNetworksSelector = () => {
  const [selectedOption, setSelectedOption] = useState<string>(internalNetworksOptions[0].id);
  const handleOptionChange = (optionId: string) => {
    setSelectedOption(optionId);
  };

  return (
    <EuiFormFieldset
      legend={{
        children: (
          <EuiTitle size="xxs">
            <span>
              {i18n.translate(
                'xpack.streams.streamDetailView.managementTab.enrichment.processor.networkDirectionInternalNetworksLabel',
                { defaultMessage: 'How do you want to define internal networks?' }
              )}
            </span>
          </EuiTitle>
        ),
      }}
    >
      {internalNetworksOptions.map(({ id, label, content }) => (
        <>
          <EuiCheckableCard
            key={id}
            id={id}
            label={label}
            checked={selectedOption === id}
            onChange={() => handleOptionChange(id)}
          >
            {selectedOption === id && content}
          </EuiCheckableCard>
          <EuiSpacer size="s" />
        </>
      ))}
    </EuiFormFieldset>
  );
};
