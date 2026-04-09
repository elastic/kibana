/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiText, EuiToolTip } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { AssetImage } from '../../../asset_image';
import {
  useStreamRoutingEvents,
  useStreamsRoutingSelector,
} from './state_management/stream_routing_state_machine';

export const QueryModeEmptyPrompt = () => {
  const { createQueryStream } = useStreamRoutingEvents();
  const canManage = useStreamsRoutingSelector(
    (snapshot) => snapshot.context.definition.privileges.manage
  );

  return (
    <EuiFlexGroup
      direction="column"
      alignItems="center"
      gutterSize="l"
      css={css`
        max-width: 500px;
        margin: 0 auto;
        padding-top: 24px;
      `}
    >
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="center">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup direction="column" gutterSize="xs">
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  <strong>{titleText}</strong>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s" color="subdued">
                  {descriptionText}
                </EuiText>
              </EuiFlexItem>
              {/* TODO: Add docs link when available */}
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <AssetImage type="queryStreamsEmptyState" size={128} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiToolTip
          position="bottom"
          content={
            !canManage
              ? i18n.translate('xpack.streams.queryModeEmptyPrompt.cannotCreateQueryStream', {
                  defaultMessage: "You don't have sufficient privileges to create query streams.",
                })
              : undefined
          }
        >
          <EuiButton
            size="s"
            data-test-subj="streamsAppQueryModeCreateButton"
            onClick={createQueryStream}
            disabled={!canManage}
          >
            {createButtonText}
          </EuiButton>
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const titleText = i18n.translate('xpack.streams.queryModeEmptyPrompt.title', {
  defaultMessage: 'Create a virtual subset of your data',
});

const descriptionText = i18n.translate('xpack.streams.queryModeEmptyPrompt.description', {
  defaultMessage:
    'Use an ES|QL query to define a sub-stream for exploration and analysis without altering ingestion or changing your data.',
});

const createButtonText = i18n.translate('xpack.streams.queryModeEmptyPrompt.createButton', {
  defaultMessage: 'Create query sub-stream',
});
