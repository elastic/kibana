/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFormRow,
  EuiFieldText,
  EuiComboBox,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTextArea,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { TabProps } from './types';

export function OverviewTab({
  formData,
  setFormData,
  existingStream,
  availableStreams,
}: TabProps & {
  existingStream: boolean;
  availableStreams: Array<{ label: string }>;
}) {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <>
      {!existingStream && (
        <EuiFormRow
          label={i18n.translate('xpack.streams.groupStreamModificationFlyout.streamNameLabel', {
            defaultMessage: 'Stream name',
          })}
        >
          <EuiFieldText
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            disabled={existingStream}
          />
        </EuiFormRow>
      )}
      <EuiFormRow
        label={i18n.translate('xpack.streams.groupStreamModificationFlyout.descriptionLabel', {
          defaultMessage: 'Description',
        })}
      >
        <EuiTextArea
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          rows={3}
        />
      </EuiFormRow>
      <MetadataEditor
        onChange={(metadata) => {
          setFormData({ ...formData, metadata });
        }}
        value={formData.metadata}
      />
      <EuiFormRow
        label={i18n.translate('xpack.streams.groupStreamModificationFlyout.tagsLabel', {
          defaultMessage: 'Tags',
        })}
      >
        <EuiComboBox
          noSuggestions
          selectedOptions={formData.tags}
          onCreateOption={(searchValue: string) => {
            const newOption = { label: searchValue };
            setFormData({ ...formData, tags: [...formData.tags, newOption] });
          }}
          onChange={(options: Array<{ label: string }>) => {
            setFormData({ ...formData, tags: options });
          }}
        />
      </EuiFormRow>

      <EuiFormRow
        label={i18n.translate('xpack.streams.groupStreamModificationFlyout.membersLabel', {
          defaultMessage: 'Members',
        })}
      >
        <EuiComboBox
          options={availableStreams}
          selectedOptions={formData.members}
          onChange={(options) => {
            setFormData({ ...formData, members: options });
          }}
        />
      </EuiFormRow>
    </>
  );
}

function MetadataEditor({
  onChange,
  value,
}: {
  value: Record<string, string>;
  onChange: (value: Record<string, string>) => void;
}) {
  const [pairs, setPairs] = React.useState<{ key: string; value: string }[]>(
    Object.entries(value).map(([key, val]) => ({ key, value: val }))
  );

  const handlePairChange = (index: number, field: 'key' | 'value', fieldValue: string) => {
    const newPairs = pairs.map((pair, i) =>
      i === index ? { ...pair, [field]: fieldValue } : pair
    );
    setPairs(newPairs);

    const metadata = Object.fromEntries(
      newPairs.filter((pair) => pair.key && pair.value).map((pair) => [pair.key, pair.value])
    );
    onChange(metadata);
  };

  const handleAddPair = () => {
    setPairs([...pairs, { key: '', value: '' }]);
  };

  const handleRemovePair = (index: number) => {
    const newPairs = pairs.filter((_, i) => i !== index);
    setPairs(newPairs);

    const metadata = Object.fromEntries(
      newPairs.filter((pair) => pair.key && pair.value).map((pair) => [pair.key, pair.value])
    );
    onChange(metadata);
  };

  return (
    <EuiFormRow
      label={
        <>
          {i18n.translate('xpack.streams.groupStreamModificationFlyout.metadataLabel', {
            defaultMessage: 'Metadata',
          })}
          <EuiButtonIcon
            iconType="plusInCircle"
            aria-label={i18n.translate(
              'xpack.streams.groupStreamModificationFlyout.addMetadataButtonLabel',
              {
                defaultMessage: 'Add',
              }
            )}
            onClick={handleAddPair}
          />
        </>
      }
    >
      <>
        {pairs.map((pair, index) => (
          <React.Fragment key={index}>
            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiFlexItem grow={2}>
                <EuiFieldText
                  placeholder={i18n.translate(
                    'xpack.streams.groupStreamModificationFlyout.metadataKeyPlaceholder',
                    {
                      defaultMessage: 'Key',
                    }
                  )}
                  value={pair.key}
                  onChange={(e) => handlePairChange(index, 'key', e.target.value)}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={3}>
                <EuiFieldText
                  placeholder={i18n.translate(
                    'xpack.streams.groupStreamModificationFlyout.metadataValuePlaceholder',
                    {
                      defaultMessage: 'Value',
                    }
                  )}
                  value={pair.value}
                  onChange={(e) => handlePairChange(index, 'value', e.target.value)}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  iconType="cross"
                  color="danger"
                  aria-label={i18n.translate(
                    'xpack.streams.groupStreamModificationFlyout.removeMetadataButtonLabel',
                    {
                      defaultMessage: 'Remove',
                    }
                  )}
                  onClick={() => handleRemovePair(index)}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
          </React.Fragment>
        ))}
        {pairs.length === 0 &&
          i18n.translate('xpack.streams.groupStreamModificationFlyout.noMetadataLabel', {
            defaultMessage: 'No metadata added',
          })}
      </>
    </EuiFormRow>
  );
}
