/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCheckableCard,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DestinationStorage } from './canvas/types';

export interface DestinationConfigurationDetails {
  name: string;
  storage: DestinationStorage;
}

const STORAGE_OPTIONS: Array<{ id: DestinationStorage; label: string }> = [
  {
    id: 'local',
    label: i18n.translate('xpack.streams.destinationConfigurationFlyout.storageLocal', {
      defaultMessage: 'Local Elasticsearch',
    }),
  },
  {
    id: 'external',
    label: i18n.translate('xpack.streams.destinationConfigurationFlyout.storageExternal', {
      defaultMessage: 'External storage',
    }),
  },
];

// The flyout that opens when a freshly-placed destination card is clicked. It
// mirrors the source configuration flow: pick a name and a storage target, then
// Save turns the node into a regular (still unconnected) configured destination.
export function DestinationConfigurationFlyout({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (details: DestinationConfigurationDetails) => void;
}) {
  const titleId = useGeneratedHtmlId({ prefix: 'destinationConfigFlyoutTitle' });
  const radioGroupId = useGeneratedHtmlId({ prefix: 'destinationStorage' });
  const [name, setName] = useState('');
  const [storage, setStorage] = useState<DestinationStorage>('local');

  return (
    <EuiFlyout
      size="s"
      onClose={onClose}
      aria-labelledby={titleId}
      data-test-subj="destinationConfigurationFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="xs">
          <h4 id={titleId}>
            {i18n.translate('xpack.streams.destinationConfigurationFlyout.title', {
              defaultMessage: 'Configure destination',
            })}
          </h4>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.streams.destinationConfigurationFlyout.subtitle', {
            defaultMessage: 'Define where your data will go',
          })}
        </EuiText>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiFormRow
          label={i18n.translate('xpack.streams.destinationConfigurationFlyout.nameLabel', {
            defaultMessage: 'Name',
          })}
          helpText={i18n.translate('xpack.streams.destinationConfigurationFlyout.nameHelpText', {
            defaultMessage: "Permanent once created. Destinations can't be renamed.",
          })}
          fullWidth
        >
          <EuiFieldText
            fullWidth
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={i18n.translate(
              'xpack.streams.destinationConfigurationFlyout.namePlaceholder',
              { defaultMessage: 'logs-nginx-default' }
            )}
            aria-label={i18n.translate('xpack.streams.destinationConfigurationFlyout.nameLabel', {
              defaultMessage: 'Name',
            })}
            data-test-subj="destinationConfigurationFlyoutNameInput"
          />
        </EuiFormRow>
        <EuiSpacer size="m" />
        {STORAGE_OPTIONS.map((option, index) => (
          <React.Fragment key={option.id}>
            {index > 0 ? <EuiSpacer size="s" /> : null}
            <EuiCheckableCard
              id={`${radioGroupId}-${option.id}`}
              name={radioGroupId}
              label={option.label}
              value={option.id}
              checked={storage === option.id}
              onChange={() => setStorage(option.id)}
              data-test-subj={`destinationConfigurationFlyoutStorage-${option.id}`}
            />
          </React.Fragment>
        ))}
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={onClose}
              flush="left"
              data-test-subj="destinationConfigurationFlyoutCancelButton"
            >
              {i18n.translate('xpack.streams.destinationConfigurationFlyout.cancel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={() => onSave({ name, storage })}
              data-test-subj="destinationConfigurationFlyoutSaveButton"
            >
              {i18n.translate('xpack.streams.destinationConfigurationFlyout.save', {
                defaultMessage: 'Save destination',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
