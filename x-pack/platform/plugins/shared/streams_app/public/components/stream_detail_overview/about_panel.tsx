/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
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
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { Streams } from '@kbn/streams-schema';
import { omit } from 'lodash';
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

  const { euiTheme } = useEuiTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [descriptionValue, setDescriptionValue] = useState(description ?? '');
  const [showEditButton, setShowEditButton] = useState(false);

  const saveDescription = useCallback(
    async (newDescription: string) => {
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
        setIsEditing(false);
      }
    },
    [definition, updateStream, notifications, refresh]
  );

  useEffect(() => {
    const handleKeyup = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        saveDescription(descriptionValue.trim());
      }
      if (e.key === 'Escape') {
        setIsEditing(false);
      }
    };
    window.addEventListener('keyup', handleKeyup);
    return () => window.removeEventListener('keyup', handleKeyup);
  }, [saveDescription, descriptionValue]);

  return (
    <EuiPanel
      hasBorder
      paddingSize="m"
      css={css`
        overflow: hidden;
      `}
      onMouseEnter={() => setShowEditButton(true)}
      onMouseLeave={() => setShowEditButton(false)}
    >
      <EuiFlexGroup>
        <EuiFlexItem grow>
          <EuiTitle size="xs">
            <h2>
              {i18n.translate('xpack.streams.streamOverview.aboutPanel.title', {
                defaultMessage: 'About this stream',
              })}
            </h2>
          </EuiTitle>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          {canEditDescription && showEditButton && (
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
        </EuiFlexItem>
      </EuiFlexGroup>

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
        <>
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
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
              }
            }}
            onChange={(e) => setDescriptionValue(e.target.value)}
          />
          <EuiSpacer size="xs" />
          <EuiText size="xs" color="gray">
            <p css={css``}>
              {i18n.translate('xpack.streams.streamOverview.aboutPanel.markdownAllowedTextLabel', {
                defaultMessage: 'Markdown is allowed',
              })}
            </p>
          </EuiText>
        </>
      )}

      {/* Read mode: render saved description with an edit button */}
      {!isEditing && description && (
        <EuiMarkdownFormat
          textSize="s"
          color="subdued"
          onClick={() => setIsEditing(true)}
          css={css`
            cursor: pointer;
          `}
        >
          {description}
        </EuiMarkdownFormat>
      )}

      {/* Empty state: invite the user to add a description */}
      {!isEditing && !description && canEditDescription && (
        <EuiText size="s" color="subdued">
          <button
            type="button"
            css={css`
              color: ${euiTheme.colors.primary};
              cursor: pointer;
              text-decoration: underline;
              margin-right: ${euiTheme.size.xs};
              background: none;
              border: none;
              padding: 0;
              font: inherit;
            `}
            onClick={() => setIsEditing(true)}
          >
            {i18n.translate('xpack.streams.streamOverview.aboutPanel.enterDescription', {
              defaultMessage: 'Enter description',
            })}
          </button>
          {i18n.translate('xpack.streams.streamOverview.aboutPanel.toHelpIdentifyThisTextLabel', {
            defaultMessage: 'to help identify this stream',
          })}
        </EuiText>
      )}
    </EuiPanel>
  );
}
