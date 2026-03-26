/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiCheckableCard,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormFieldset,
  EuiFormRow,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { Fragment, useState, type ReactNode } from 'react';
import { Controller, useFieldArray, useFormContext } from 'react-hook-form';
import type { NetworkDirectionFormState } from '../../../../types';
import { ProcessorFieldSelector } from '../processor_field_selector';

interface InternalNetworksFieldInputProps {
  index: number;
  onRemove: (index: number) => void;
}

const InternalNetworksFieldInput = ({ index, onRemove }: InternalNetworksFieldInputProps) => {
  const { control } = useFormContext();

  return (
    <EuiFlexGroup direction="row" alignItems="center" gutterSize="s">
      <EuiFlexItem>
        <Controller
          control={control}
          name={`internal_networks.${index}.value`}
          render={({ field }) => (
            <EuiFormRow>
              <EuiFieldText
                value={field.value}
                onChange={field.onChange}
                fullWidth
                data-test-subj="streamsAppInternalNetworksInput"
              />
            </EuiFormRow>
          )}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          iconType="trash"
          color="danger"
          size="m"
          onClick={() => onRemove(index)}
          aria-label={i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.processor.networkDirectionsSelectorInternalNetworksRemoveButton',
            { defaultMessage: 'Remove' }
          )}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const InternalNetworksContent = () => {
  const { fields, append, remove } = useFieldArray<
    Pick<NetworkDirectionFormState, 'internal_networks'>
  >({
    name: 'internal_networks',
  });

  const handleAdd = () => append({ value: '' });

  const handleRemove = (index: number) => remove(index);

  return (
    <EuiFormRow
      label={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.networkDirectionsSelectorInternalNetworksLabel',
        { defaultMessage: 'Enter IPv4/IPv6 addresses, CIDR ranges, or named ranges.' }
      )}
    >
      <EuiFlexGroup direction="column" gutterSize="s">
        {fields.map((field, index) => (
          <EuiFlexItem key={field.id}>
            <InternalNetworksFieldInput index={index} onRemove={handleRemove} />
          </EuiFlexItem>
        ))}
        <EuiButtonIcon
          iconType="plus"
          display="base"
          color="text"
          onClick={handleAdd}
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
  const { unregister, watch } = useFormContext();
  const internalNetworks = watch('internal_networks');
  const initialSelectedOption = internalNetworks ? 'internal_networks' : 'internal_networks_field';
  const [selectedOption, setSelectedOption] = useState<string>(initialSelectedOption);

  const handleOptionChange = (optionId: string) => {
    setSelectedOption(optionId);
    const unregisterOption =
      optionId === 'internal_networks' ? 'internal_networks_field' : 'internal_networks';
    unregister(unregisterOption);
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
        <Fragment key={id}>
          <EuiCheckableCard
            id={id}
            label={label}
            checked={selectedOption === id}
            onChange={() => handleOptionChange(id)}
          >
            {selectedOption === id && content}
          </EuiCheckableCard>
          <EuiSpacer size="s" />
        </Fragment>
      ))}
    </EuiFormFieldset>
  );
};
