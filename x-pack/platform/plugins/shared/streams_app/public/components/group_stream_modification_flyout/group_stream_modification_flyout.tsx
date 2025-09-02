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
  EuiSpacer,
  EuiButton,
} from '@elastic/eui';
import type { NotificationsStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { useAbortController } from '@kbn/react-hooks';
import type { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import type { Streams } from '@kbn/streams-schema';
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
    members:
      existingStream?.group.members.map((member) => ({
        label: member,
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  async function modifyGroupStream() {
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
                tags: selectedTags.map((opt) => opt.label),
                members: formData.members.map((opt) => opt.label),
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
          <EuiFieldText
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            disabled={!!existingStream}
          />
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
          label={i18n.translate('xpack.streams.groupStreamModificationFlyout.membersLabel', {
            defaultMessage: 'Members',
          })}
          helpText={i18n.translate('xpack.streams.groupStreamModificationFlyout.membersHelpText', {
            defaultMessage: 'Select the members of this Group stream',
          })}
        >
          <EuiComboBox
            placeholder={i18n.translate(
              'xpack.streams.groupStreamModificationFlyout.membersPlaceholder',
              {
                defaultMessage: 'Select members',
              }
            )}
            options={streamsOptions}
            selectedOptions={formData.members}
            onChange={(options) => {
              setFormData({ ...formData, members: options });
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
