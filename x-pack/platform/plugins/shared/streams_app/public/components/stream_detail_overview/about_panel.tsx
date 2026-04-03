/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiMarkdownFormat,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { Streams } from '@kbn/streams-schema';
import { omit } from 'lodash';
import React, { useCallback, useState } from 'react';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamDetail } from '../../hooks/use_stream_detail';
import { useUpdateStreams } from '../../hooks/use_update_streams';
import { getFormattedError } from '../../util/errors';

export function AboutPanel() {
  const { definition, refresh } = useStreamDetail();
  const { description } = definition.stream;

  const queryStream = Streams.QueryStream.GetResponse.is(definition) ? definition : null;

  const canEditDescription =
    Streams.ingest.all.GetResponse.is(definition) && definition.privileges.manage;

  const {
    core: { notifications },
  } = useKibana();
  const updateStream = useUpdateStreams(definition.stream.name);

  const [isEditing, setIsEditing] = useState(false);
  const [descriptionValue, setDescriptionValue] = useState(description ?? '');
  const [isUpdating, setIsUpdating] = useState(false);

  const saveDescription = useCallback(
    async (newDescription: string) => {
      setIsUpdating(true);
      const stream = Streams.ingest.all.Definition.is(definition.stream)
        ? {
            ...omit(definition.stream, ['name', 'updated_at']),
            ingest: {
              ...definition.stream.ingest,
              processing: omit(definition.stream.ingest.processing, ['updated_at']),
            },
          }
        : omit(definition.stream, ['name', 'updated_at']);
      try {
        await updateStream(
          Streams.all.UpsertRequest.parse({
            dashboards: definition.dashboards,
            queries: definition.queries,
            rules: definition.rules,
            stream: { ...stream, description: newDescription },
          })
        );
        notifications.toasts.addSuccess({
          title: i18n.translate('xpack.streams.streamOverview.aboutPanel.saveDescriptionSuccess', {
            defaultMessage: 'Description saved',
          }),
        });
        refresh();
      } catch (error) {
        notifications.toasts.addError(getFormattedError(error), {
          title: i18n.translate('xpack.streams.streamOverview.aboutPanel.saveDescriptionError', {
            defaultMessage: 'Failed to save description',
          }),
        });
      } finally {
        setIsUpdating(false);
        setIsEditing(false);
      }
    },
    [definition, updateStream, notifications, refresh]
  );

  return (
    <EuiPanel
      hasBorder
      paddingSize="m"
      css={css`
        overflow: hidden;
      `}
    >
      <EuiTitle size="xs">
        <h2>
          {i18n.translate('xpack.streams.streamOverview.aboutPanel.title', {
            defaultMessage: 'About this stream',
          })}
        </h2>
      </EuiTitle>

      <EuiSpacer size="m" />

      {/* Always show the ES|QL source for query streams */}
      {queryStream && (
        <>
          <EuiCodeBlock language="esql" isCopyable paddingSize="m" overflowHeight={200}>
            {queryStream.stream.query.esql}
          </EuiCodeBlock>
          <EuiSpacer size="m" />
        </>
      )}

      {/* Edit mode: textarea + save/cancel */}
      {isEditing && canEditDescription && (
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem>
            <EuiTextArea
              fullWidth
              placeholder={i18n.translate(
                'xpack.streams.streamOverview.aboutPanel.descriptionPlaceholder',
                { defaultMessage: 'Enter a description for this stream' }
              )}
              aria-label={i18n.translate(
                'xpack.streams.streamOverview.aboutPanel.descriptionInputAriaLabel',
                { defaultMessage: 'Edit stream description' }
              )}
              value={descriptionValue}
              onChange={(e) => setDescriptionValue(e.target.value)}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType="check"
              isLoading={isUpdating}
              onClick={() => saveDescription(descriptionValue)}
              aria-label={i18n.translate(
                'xpack.streams.streamOverview.aboutPanel.saveDescriptionAriaLabel',
                { defaultMessage: 'Save description' }
              )}
            />
            <EuiButtonIcon
              iconType="cross"
              onClick={() => setIsEditing(false)}
              aria-label={i18n.translate(
                'xpack.streams.streamOverview.aboutPanel.cancelDescriptionAriaLabel',
                { defaultMessage: 'Cancel' }
              )}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}

      {/* Read mode: render saved description with an edit button */}
      {!isEditing && description && (
        <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
          <EuiFlexItem>
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              <EuiMarkdownFormat textSize="s" color="subdued">
                {description}
              </EuiMarkdownFormat>
            </div>
          </EuiFlexItem>
          {canEditDescription && (
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                iconType="pencil"
                onClick={() => setIsEditing(true)}
                aria-label={i18n.translate(
                  'xpack.streams.streamOverview.aboutPanel.editDescriptionAriaLabel',
                  { defaultMessage: 'Edit description' }
                )}
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      )}

      {/* Empty state: invite the user to add a description */}
      {!isEditing && !description && canEditDescription && (
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText
              size="s"
              color="primary"
              onClick={() => setIsEditing(true)}
              css={css`
                cursor: pointer;
              `}
            >
              {i18n.translate('xpack.streams.streamOverview.aboutPanel.enterDescription', {
                defaultMessage: 'Enter description',
              })}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              {i18n.translate(
                'xpack.streams.streamOverview.aboutPanel.toHelpIdentifyThisTextLabel',
                { defaultMessage: 'to help identify this stream' }
              )}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </EuiPanel>
  );
}
