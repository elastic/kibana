/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MouseEvent, ChangeEvent } from 'react';
import React, { useState, useEffect } from 'react';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiWrappingPopover,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { useUpdateTags } from '../hooks';
import { sanitizeTag } from '../utils';

interface Props {
  tagName: string;
  isTagHovered: boolean;
  onTagsUpdated: (tagsToAdd: string[], tagsToRemove: string[], hasCompleted?: boolean) => void;
}

export const TagOptions: React.FC<Props> = ({ tagName, isTagHovered, onTagsUpdated }: Props) => {
  const [tagOptionsVisible, setTagOptionsVisible] = useState<boolean>(false);
  const [tagOptionsButton, setTagOptionsButton] = useState<HTMLElement>();
  const [tagMenuButtonVisible, setTagMenuButtonVisible] = useState<boolean>(isTagHovered);
  const [updatedName, setUpdatedName] = useState<string | undefined>(tagName);

  useEffect(() => {
    setTagMenuButtonVisible(isTagHovered || tagOptionsVisible);
  }, [isTagHovered, tagOptionsVisible]);

  useEffect(() => {
    setUpdatedName(tagName);
  }, [tagName]);

  const closePopover = (isDelete = false) => {
    setTagOptionsVisible(false);
    if (isDelete) {
      handleDelete();
    } else {
      handleRename(updatedName);
    }
  };

  const updateTagsHook = useUpdateTags();
  const bulkUpdateTags = updateTagsHook.bulkUpdateTags;

  const TAGS_QUERY = 'tags:"{name}"';

  const handleRename = (newName?: string) => {
    if (newName === tagName || !newName) {
      return;
    }
    const kuery = TAGS_QUERY.replace('{name}', tagName);
    bulkUpdateTags(
      kuery,
      [newName],
      [tagName],
      (hasCompleted) => onTagsUpdated([newName], [tagName], hasCompleted),
      i18n.translate('xpack.fleet.renameAgentTags.successNotificationTitle', {
        defaultMessage: 'Tag renamed',
      }),
      i18n.translate('xpack.fleet.renameAgentTags.errorNotificationTitle', {
        defaultMessage: 'Tag rename failed',
      })
    );
  };

  const handleDelete = () => {
    const kuery = TAGS_QUERY.replace('{name}', tagName);
    updateTagsHook.bulkUpdateTags(
      kuery,
      [],
      [tagName],
      (hasCompleted) => onTagsUpdated([], [tagName], hasCompleted),
      i18n.translate('xpack.fleet.deleteAgentTags.successNotificationTitle', {
        defaultMessage: 'Tag deleted',
      }),
      i18n.translate('xpack.fleet.deleteAgentTags.errorNotificationTitle', {
        defaultMessage: 'Tag delete failed',
      })
    );
  };

  return (
    <>
      {tagMenuButtonVisible && (
        <EuiButtonIcon
          iconType="boxesHorizontal"
          aria-label={i18n.translate('xpack.fleet.tagOptions.tagOptionsToggleButtonLabel', {
            defaultMessage: 'Tag Options',
          })}
          color="text"
          onClick={(event: MouseEvent<HTMLButtonElement>) => {
            setTagOptionsButton(event.currentTarget);
            setTagOptionsVisible(!tagOptionsVisible);
          }}
        />
      )}
      {tagOptionsVisible && (
        <EuiWrappingPopover
          isOpen={true}
          button={tagOptionsButton!}
          closePopover={closePopover}
          anchorPosition="downCenter"
        >
          <EuiFlexGroup direction="column" alignItems="flexStart" gutterSize="xs">
            <EuiFlexItem>
              <EuiFieldText
                placeholder={i18n.translate('xpack.fleet.tagOptions.nameTextFieldPlaceholder', {
                  defaultMessage: 'Enter new name for tag',
                })}
                value={updatedName}
                required
                onKeyDown={(e: { key: string }) => {
                  if (e.key === 'Enter') {
                    closePopover();
                  }
                }}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  const newName = e.currentTarget.value;
                  setUpdatedName(sanitizeTag(newName));
                }}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiButtonEmpty
                size="s"
                color="danger"
                onClick={() => {
                  closePopover(true);
                }}
              >
                <EuiIcon type="trash" />{' '}
                <FormattedMessage
                  id="xpack.fleet.tagOptions.deleteText"
                  defaultMessage="Delete tag"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiWrappingPopover>
      )}
    </>
  );
};
