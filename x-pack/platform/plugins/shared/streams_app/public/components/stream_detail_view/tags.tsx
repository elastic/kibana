/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
  EuiComboBox,
  EuiButtonIcon,
  EuiPopover,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { convertGetResponseIntoUpsertRequest, type Streams } from '@kbn/streams-schema';
import React, { useEffect, useState, useCallback } from 'react';
import { css } from '@emotion/react';
import { useStreamDetail } from '../../hooks/use_stream_detail';
import { useUpdateStreams } from '../../hooks/use_update_streams';

const TAGS_PLACEHOLDER = i18n.translate('xpack.streams.streamTags.placeholder', {
  defaultMessage: 'Type and press Enter to add tags',
});

const ADD_TAG_LABEL = i18n.translate('xpack.streams.streamTags.addTagLabel', {
  defaultMessage: 'Add tag',
});

const NO_TAGS_LABEL = i18n.translate('xpack.streams.streamTags.noTagsLabel', {
  defaultMessage: 'No tags',
});

interface Props {
  definition: Streams.ingest.all.GetResponse;
}

export function StreamTags({ definition }: Props) {
  const { refresh } = useStreamDetail();
  const updateStream = useUpdateStreams(definition.stream.name);
  const [tags, setTags] = useState<string[]>(definition.stream.tags ?? []);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const canManage = definition.privileges.manage === true;

  useEffect(() => {
    setTags(definition.stream.tags ?? []);
  }, [definition.stream.tags]);

  const saveTags = useCallback(
    async (newTags: string[]) => {
      const request = convertGetResponseIntoUpsertRequest(definition);
      request.stream.tags = newTags.length > 0 ? newTags : undefined;

      await updateStream(request);
      refresh();
    },
    [definition, updateStream, refresh]
  );

  const handleTagRemove = useCallback(
    async (tagToRemove: string) => {
      const newTags = tags.filter((tag) => tag !== tagToRemove);
      setTags(newTags);
      await saveTags(newTags);
    },
    [tags, saveTags]
  );

  const handleTagsChange = useCallback((options: EuiComboBoxOptionOption[]) => {
    setTags(options.map((option) => option.label));
  }, []);

  const handleTagCreate = useCallback((value: string) => {
    const trimmedValue = value.trim();
    if (trimmedValue) {
      setTags((prevTags) => [...prevTags, trimmedValue]);
    }
  }, []);

  const handleSave = useCallback(async () => {
    setIsPopoverOpen(false);
    await saveTags(tags);
  }, [tags, saveTags]);

  const handleCancel = useCallback(() => {
    setIsPopoverOpen(false);
    setTags(definition.stream.tags ?? []);
  }, [definition.stream.tags]);

  if (!canManage && tags.length === 0) {
    return (
      <EuiText size="xs" color="subdued" data-test-subj="streamTagsEmpty">
        {NO_TAGS_LABEL}
      </EuiText>
    );
  }

  const renderTagBadge = (tag: string) => {
    if (canManage) {
      return (
        <EuiBadge
          data-test-subj={`streamTag-${tag}`}
          color="hollow"
          iconType="cross"
          iconSide="right"
          iconOnClick={() => handleTagRemove(tag)}
          iconOnClickAriaLabel={i18n.translate('xpack.streams.streamTags.removeTagAriaLabel', {
            defaultMessage: 'Remove tag {tag}',
            values: { tag },
          })}
        >
          {tag}
        </EuiBadge>
      );
    }
    return (
      <EuiBadge data-test-subj={`streamTag-${tag}`} color="hollow">
        {tag}
      </EuiBadge>
    );
  };

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" wrap responsive={false}>
      {tags.map((tag) => (
        <EuiFlexItem key={tag} grow={false}>
          {renderTagBadge(tag)}
        </EuiFlexItem>
      ))}
      {canManage && (
        <EuiFlexItem grow={false}>
          <EuiPopover
            data-test-subj="streamTagsPopover"
            button={
              <EuiButtonIcon
                data-test-subj="streamTagsAddButton"
                iconType="plusInCircle"
                aria-label={ADD_TAG_LABEL}
                onClick={() => {
                  setIsPopoverOpen(!isPopoverOpen);
                }}
                size="xs"
                color="text"
              />
            }
            isOpen={isPopoverOpen}
            closePopover={handleCancel}
            panelPaddingSize="s"
            anchorPosition="downLeft"
          >
            <div
              css={css`
                width: 250px;
              `}
            >
              <EuiComboBox
                data-test-subj="streamTagsComboBox"
                compressed
                fullWidth
                noSuggestions
                placeholder={TAGS_PLACEHOLDER}
                selectedOptions={tags.map((tag) => ({ label: tag }))}
                onCreateOption={handleTagCreate}
                onChange={handleTagsChange}
                onBlur={handleSave}
                autoFocus
              />
            </div>
          </EuiPopover>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}
