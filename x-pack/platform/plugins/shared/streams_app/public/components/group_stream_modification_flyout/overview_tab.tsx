/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFormRow,
  EuiFieldText,
  EuiSelect,
  EuiComboBox,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { TabProps } from './types';

export function OverviewTab({
  formData,
  setFormData,
  existingStream,
}: TabProps & { existingStream: boolean }) {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
        <EuiFieldText
          name="description"
          value={formData.description}
          onChange={handleInputChange}
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate('xpack.streams.groupStreamModificationFlyout.ownerLabel', {
          defaultMessage: 'Owner',
        })}
      >
        <EuiFieldText name="owner" value={formData.owner} onChange={handleInputChange} />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate('xpack.streams.groupStreamModificationFlyout.tierLabel', {
          defaultMessage: 'Tier',
        })}
      >
        <EuiSelect
          name="tier"
          value={formData.tier}
          onChange={handleInputChange}
          options={[
            { value: '1', text: '1' },
            { value: '2', text: '2' },
            { value: '3', text: '3' },
            { value: '4', text: '4' },
          ]}
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

      <LinkListEditor
        label={i18n.translate('xpack.streams.groupStreamModificationFlyout.runbookLinksLabel', {
          defaultMessage: 'Runbook links',
        })}
        value={formData.runbookLinks}
        onChange={(runbookLinks) => setFormData({ ...formData, runbookLinks })}
      />

      <LinkListEditor
        label={i18n.translate(
          'xpack.streams.groupStreamModificationFlyout.documentationLinksLabel',
          {
            defaultMessage: 'Documentation links',
          }
        )}
        value={formData.documentationLinks}
        onChange={(documentationLinks) => setFormData({ ...formData, documentationLinks })}
      />

      <LinkListEditor
        label={i18n.translate('xpack.streams.groupStreamModificationFlyout.repositoryLinksLabel', {
          defaultMessage: 'Repository links',
        })}
        value={formData.repositoryLinks}
        onChange={(repositoryLinks) => setFormData({ ...formData, repositoryLinks })}
      />
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
                  iconType="trash"
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

function LinkListEditor({
  value,
  onChange,
  label,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  label: string;
}) {
  const [links, setLinks] = React.useState<string[]>(value ?? []);

  const handleLinkChange = (index: number, link: string) => {
    const newLinks = links.map((item, i) => (i === index ? link : item));
    setLinks(newLinks);
    onChange(newLinks.filter((l) => l));
  };

  const handleAddLink = () => {
    setLinks([...links, '']);
  };

  const handleRemoveLink = (index: number) => {
    const newLinks = links.filter((_, i) => i !== index);
    setLinks(newLinks);
    onChange(newLinks.filter((l) => l));
  };

  return (
    <EuiFormRow
      label={
        <>
          {label}
          <EuiButtonIcon
            iconType="plusInCircle"
            aria-label={i18n.translate(
              'xpack.streams.groupStreamModificationFlyout.addLinkButtonLabel',
              { defaultMessage: 'Add' }
            )}
            onClick={handleAddLink}
          />
        </>
      }
    >
      <>
        {links.map((link, index) => (
          <React.Fragment key={index}>
            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiFlexItem grow={5}>
                <EuiFieldText
                  value={link}
                  onChange={(e) => handleLinkChange(index, e.target.value)}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  iconType="trash"
                  color="danger"
                  aria-label={i18n.translate(
                    'xpack.streams.groupStreamModificationFlyout.removeLinkButtonLabel',
                    { defaultMessage: 'Remove' }
                  )}
                  onClick={() => handleRemoveLink(index)}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
          </React.Fragment>
        ))}
        {links.length === 0 &&
          i18n.translate('xpack.streams.groupStreamModificationFlyout.noLinksLabel', {
            defaultMessage: 'No links added',
          })}
      </>
    </EuiFormRow>
  );
}
