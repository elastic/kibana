/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
} from '@elastic/eui';
import type { Streams } from '@kbn/streams-schema';
import { i18n } from '@kbn/i18n';
import { EditQueryStreamFlyout } from './edit_query_stream_flyout';
import { css } from '@emotion/react';

interface StreamConfigurationPanelProps {
  definition: Streams.QueryStream.GetResponse;
  refreshDefinition: () => void;
}

export function StreamConfigurationPanel({
  definition,
  refreshDefinition,
}: StreamConfigurationPanelProps) {
  const [isEditFlyoutOpen, setIsEditFlyoutOpen] = useState(false);

  const esqlQuery = definition.stream.query.esql;

  return (
    <>
      <EuiPanel hasBorder={true} hasShadow={false} paddingSize="none" grow={false}>
        <EuiPanel hasShadow={false} color="subdued">
          <EuiText size="s">
            <h3>
              {i18n.translate('xpack.streams.streamConfigurationPanel.title', {
                defaultMessage: 'Stream Configuration',
              })}
            </h3>
          </EuiText>
        </EuiPanel>

        <EuiPanel hasShadow={false} hasBorder={false}>
          <EuiFlexGroup alignItems="flexStart" gutterSize="l">
            <EuiFlexItem grow={false}>
              <EuiCodeBlock
                language="esql"
                paddingSize="m"
                isCopyable
                css={css`
                  min-height: 100px;
                `}
              >
                {esqlQuery}
              </EuiCodeBlock>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiButton iconType="pencil" onClick={() => setIsEditFlyoutOpen(true)}>
                {i18n.translate('xpack.streams.streamConfigurationPanel.editQueryButtonLabel', {
                  defaultMessage: 'Edit Query with preview',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiPanel>

      {isEditFlyoutOpen && (
        <EditQueryStreamFlyout
          definition={definition}
          onClose={() => setIsEditFlyoutOpen(false)}
          onSave={() => {
            setIsEditFlyoutOpen(false);
            refreshDefinition();
          }}
        />
      )}
    </>
  );
}
