/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiFormRow,
  EuiFieldText,
  EuiComboBox,
  EuiSelect,
  EuiSpacer,
  EuiButton,
} from '@elastic/eui';
import { NotificationsStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { useAbortController } from '@kbn/react-hooks';
import { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import { Streams } from '@kbn/streams-schema';
import React from 'react';

export function GroupStreamModificationFlyout({
  client,
  notifications,
  streamsList,
  refresh,
  existingStream,
}: {
  client: StreamsRepositoryClient;
  notifications: NotificationsStart;
  streamsList?: Array<{ stream: Streams.all.Definition }>;
  refresh: () => void;
  existingStream?: Streams.GroupStream.Definition;
}) {
  const { signal } = useAbortController();
  const [formData, setFormData] = React.useState({
    name: existingStream?.name ?? '',
    description: existingStream?.description ?? '',
    owner: existingStream?.group.owner ?? '',
    tier: existingStream?.group.tier.toString() ?? '1',
    relationships:
      existingStream?.group.relationships.map((relationship) => ({
        label: relationship.name,
      })) ?? [],
  });

  const [selectedTags, setSelectedTags] = React.useState<Array<{ label: string }>>(
    existingStream?.group.tags.map((tag) => ({ label: tag })) ?? []
  );
  const [tagsInvalid, setTagsInvalid] = React.useState(false);

  const isValid = (value: string) => /^[a-zA-Z]+$/.test(value);

  const onCreateOption = (searchValue: string) => {
    if (!isValid(searchValue)) {
      return false;
    }
    const newOption = { label: searchValue };
    setSelectedTags([...selectedTags, newOption]);
  };

  const onSearchChange = (searchValue: string) => {
    setTagsInvalid(searchValue ? !isValid(searchValue) : false);
  };

  const onComboChange = (options: Array<{ label: string }>) => {
    setSelectedTags(options);
    setTagsInvalid(false);
  };

  const [selectedRunbookLinks, setSelectedRunbookLinks] = React.useState<Array<{ label: string }>>(
    existingStream?.group.runbook_links.map((link) => ({ label: link })) ?? []
  );
  const [selectedDocLinks, setSelectedDocLinks] = React.useState<Array<{ label: string }>>(
    existingStream?.group.documentation_links.map((link) => ({ label: link })) ?? []
  );
  const [selectedRepoLinks, setSelectedRepoLinks] = React.useState<Array<{ label: string }>>(
    existingStream?.group.repository_links.map((link) => ({ label: link })) ?? []
  );

  const onCreateRunbookOption = (searchValue: string) => {
    const newOption = { label: searchValue };
    setSelectedRunbookLinks([...selectedRunbookLinks, newOption]);
  };

  const onRunbookComboChange = (options: Array<{ label: string }>) => {
    setSelectedRunbookLinks(options);
  };

  const onCreateDocOption = (searchValue: string) => {
    const newOption = { label: searchValue };
    setSelectedDocLinks([...selectedDocLinks, newOption]);
  };

  const onDocComboChange = (options: Array<{ label: string }>) => {
    setSelectedDocLinks(options);
  };

  const onCreateRepoOption = (searchValue: string) => {
    const newOption = { label: searchValue };
    setSelectedRepoLinks([...selectedRepoLinks, newOption]);
  };

  const onRepoComboChange = (options: Array<{ label: string }>) => {
    setSelectedRepoLinks(options);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  async function modifyGroupStream() {
    const tags = selectedTags.map((opt) => opt.label);
    const runbookLinks = selectedRunbookLinks.map((opt) => opt.label);
    const documentationLinks = selectedDocLinks.map((opt) => opt.label);
    const repositoryLinks = selectedRepoLinks.map((opt) => opt.label);
    const relationships = formData.relationships.map((r) => ({
      name: r.label as string,
      type: 'member' as const,
      filter: '*',
    }));

    let streamBaseData: any = {};

    if (existingStream) {
      streamBaseData = await client.fetch('GET /api/streams/{name} 2023-10-31', {
        params: {
          path: { name: formData.name },
        },
        signal,
      });
    }

    client
      .fetch('PUT /api/streams/{name} 2023-10-31', {
        params: {
          path: { name: formData.name },
          body: {
            dashboards: [],
            queries: [],
            ...streamBaseData,
            stream: {
              description: formData.description,
              group: {
                type: 'group',
                owner: formData.owner,
                tier: parseInt(
                  formData.tier,
                  10
                ) as Streams.GroupStream.Definition['group']['tier'],
                tags,
                runbook_links: runbookLinks,
                documentation_links: documentationLinks,
                repository_links: repositoryLinks,
                relationships,
              },
            },
          },
        },
        signal,
      })
      .then(() => {
        const successTitle = existingStream
          ? i18n.translate('xpack.streams.groupStreamModificationFlyout.updatedSuccessToast', {
              defaultMessage: 'Group stream updated successfully',
            })
          : i18n.translate('xpack.streams.groupStreamModificationFlyout.createdSuccessToast', {
              defaultMessage: 'Group stream created successfully',
            });
        notifications.toasts.addSuccess({ title: successTitle });
        refresh();
      })
      .catch((error) => {
        notifications.toasts.addError(error, {
          title: existingStream
            ? i18n.translate('xpack.streams.groupStreamModificationFlyout.updateFailedToast', {
                defaultMessage: 'Failed to update Group stream',
              })
            : i18n.translate('xpack.streams.groupStreamModificationFlyout.createFailedToast', {
                defaultMessage: 'Failed to create Group stream',
              }),
        });
      });
  }

  const streamsOptions = streamsList?.map((stream) => ({
    label: stream.stream.name,
  }));

  return (
    <>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          {existingStream
            ? i18n.translate('xpack.streams.groupStreamModificationFlyout.editTitle', {
                defaultMessage: 'Edit Group stream',
              })
            : i18n.translate('xpack.streams.groupStreamModificationFlyout.createTitle', {
                defaultMessage: 'Create Group stream',
              })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiFormRow
          label={i18n.translate('xpack.streams.groupStreamModificationFlyout.streamNameLabel', {
            defaultMessage: 'Stream name',
          })}
          helpText={i18n.translate(
            'xpack.streams.groupStreamModificationFlyout.streamNameHelpText',
            {
              defaultMessage: 'Enter a unique stream name',
            }
          )}
        >
          <EuiFieldText name="name" value={formData.name} onChange={handleInputChange} />
        </EuiFormRow>
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
        <EuiFormRow
          label={i18n.translate('xpack.streams.groupStreamModificationFlyout.tagsLabel', {
            defaultMessage: 'Tags',
          })}
          helpText={i18n.translate('xpack.streams.groupStreamModificationFlyout.tagsHelpText', {
            defaultMessage: 'Enter tags (letters only)',
          })}
          isInvalid={tagsInvalid}
          error={
            tagsInvalid
              ? i18n.translate('xpack.streams.groupStreamModificationFlyout.tagsError', {
                  defaultMessage: 'Only letters are allowed',
                })
              : undefined
          }
        >
          <EuiComboBox
            noSuggestions
            placeholder={i18n.translate(
              'xpack.streams.groupStreamModificationFlyout.tagsPlaceholder',
              {
                defaultMessage: 'Create some tags (letters only)',
              }
            )}
            selectedOptions={selectedTags}
            onCreateOption={onCreateOption}
            onChange={onComboChange}
            onSearchChange={onSearchChange}
            isInvalid={tagsInvalid}
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('xpack.streams.groupStreamModificationFlyout.runbookLinksLabel', {
            defaultMessage: 'Runbook links',
          })}
          helpText={i18n.translate(
            'xpack.streams.groupStreamModificationFlyout.runbookLinksHelpText',
            {
              defaultMessage: 'Enter runbook links',
            }
          )}
        >
          <EuiComboBox
            noSuggestions
            placeholder={i18n.translate(
              'xpack.streams.groupStreamModificationFlyout.runbookLinksPlaceholder',
              {
                defaultMessage: 'Add runbook links',
              }
            )}
            selectedOptions={selectedRunbookLinks}
            onCreateOption={onCreateRunbookOption}
            onChange={onRunbookComboChange}
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate(
            'xpack.streams.groupStreamModificationFlyout.documentationLinksLabel',
            {
              defaultMessage: 'Documentation links',
            }
          )}
          helpText={i18n.translate(
            'xpack.streams.groupStreamModificationFlyout.documentationLinksHelpText',
            {
              defaultMessage: 'Enter documentation links',
            }
          )}
        >
          <EuiComboBox
            noSuggestions
            placeholder={i18n.translate(
              'xpack.streams.groupStreamModificationFlyout.documentationLinksPlaceholder',
              {
                defaultMessage: 'Add documentation links',
              }
            )}
            selectedOptions={selectedDocLinks}
            onCreateOption={onCreateDocOption}
            onChange={onDocComboChange}
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate(
            'xpack.streams.groupStreamModificationFlyout.repositoryLinksLabel',
            {
              defaultMessage: 'Repository links',
            }
          )}
          helpText={i18n.translate(
            'xpack.streams.groupStreamModificationFlyout.repositoryLinksHelpText',
            {
              defaultMessage: 'Enter repository links',
            }
          )}
        >
          <EuiComboBox
            noSuggestions
            placeholder={i18n.translate(
              'xpack.streams.groupStreamModificationFlyout.repositoryLinksPlaceholder',
              {
                defaultMessage: 'Add repository links',
              }
            )}
            selectedOptions={selectedRepoLinks}
            onCreateOption={onCreateRepoOption}
            onChange={onRepoComboChange}
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('xpack.streams.groupStreamModificationFlyout.relationshipsLabel', {
            defaultMessage: 'Relationships',
          })}
        >
          <EuiComboBox
            placeholder={i18n.translate(
              'xpack.streams.groupStreamModificationFlyout.relationshipsPlaceholder',
              {
                defaultMessage: 'Select relationships',
              }
            )}
            options={streamsOptions}
            selectedOptions={formData.relationships}
            onChange={(options) => {
              setFormData({ ...formData, relationships: options });
            }}
          />
        </EuiFormRow>
        <EuiSpacer size="m" />
        <EuiButton onClick={modifyGroupStream} fill>
          {existingStream
            ? i18n.translate('xpack.streams.groupStreamModificationFlyout.updateButtonLabel', {
                defaultMessage: 'Update',
              })
            : i18n.translate('xpack.streams.groupStreamModificationFlyout.createButtonLabel', {
                defaultMessage: 'Create',
              })}
        </EuiButton>
      </EuiModalBody>
    </>
  );
}
