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
  EuiLink,
  EuiMarkdownFormat,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { Streams } from '@kbn/streams-schema';
import React from 'react';
import { useStreamDetail } from '../../hooks/use_stream_detail';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { useStreamsPrivileges } from '../../hooks/use_streams_privileges';

export function AboutPanel() {
  const { definition } = useStreamDetail();
  const router = useStreamsAppRouter();
  const {
    features: { significantEvents },
  } = useStreamsPrivileges();

  const { name, description } = definition.stream;

  const queryStream = Streams.QueryStream.GetResponse.is(definition) ? definition : null;

  const canEditDescription =
    Streams.ingest.all.GetResponse.is(definition) &&
    definition.privileges.manage &&
    !!significantEvents?.enabled &&
    !!significantEvents?.available;

  const canEditQuery = Streams.QueryStream.GetResponse.is(definition);
  const showEditButton = canEditDescription || canEditQuery;

  const advancedTabHref = router.link('/{key}/management/{tab}', {
    path: { key: name, tab: 'advanced' },
  });

  if (!queryStream && !description && !showEditButton) {
    return null;
  }

  return (
    <EuiPanel
      hasBorder
      paddingSize="m"
      css={css`
        overflow: hidden;
      `}
    >
      <EuiFlexGroup
        alignItems="center"
        justifyContent="spaceBetween"
        gutterSize="s"
        responsive={false}
      >
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h2>
              {i18n.translate('xpack.streams.streamOverview.aboutPanel.title', {
                defaultMessage: 'About this stream',
              })}
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        {showEditButton && (
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType="pencil"
              href={advancedTabHref}
              size="s"
              aria-label={
                canEditQuery
                  ? i18n.translate('xpack.streams.streamOverview.aboutPanel.editQueryAriaLabel', {
                      defaultMessage: 'Edit query',
                    })
                  : i18n.translate('xpack.streams.streamOverview.aboutPanel.editAriaLabel', {
                      defaultMessage: 'Edit description',
                    })
              }
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      {queryStream && (
        <>
          <EuiSpacer size="m" />
          <EuiCodeBlock language="esql" isCopyable paddingSize="m" overflowHeight={200}>
            {queryStream.stream.query.esql}
          </EuiCodeBlock>
        </>
      )}

      {(description || canEditDescription) && (
        <>
          <EuiSpacer size="m" />
          {description ? (
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              <EuiMarkdownFormat textSize="s">{description}</EuiMarkdownFormat>
            </div>
          ) : (
            <EuiText size="s">
              <EuiLink href={advancedTabHref}>
                {i18n.translate('xpack.streams.streamOverview.aboutPanel.enterDescription', {
                  defaultMessage: 'Enter description',
                })}
              </EuiLink>
              {i18n.translate('xpack.streams.streamOverview.aboutPanel.enterDescriptionSuffix', {
                defaultMessage: ' to help identify this stream',
              })}
            </EuiText>
          )}
        </>
      )}
    </EuiPanel>
  );
}
