/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { Investigation } from '../../../common/investigations';
import { formatRelativeTime, getWatchProvenance, summarizeText } from './bucket_utils';

interface InvestigationRowProps {
  investigation: Investigation;
  onSelect: (investigation: Investigation) => void;
}

export const InvestigationRow: React.FC<InvestigationRowProps> = ({ investigation, onSelect }) => {
  const { euiTheme } = useEuiTheme();
  const { services } = useKibana();
  const watch = getWatchProvenance(investigation.source_watch_id);
  const summary = summarizeText(investigation.summary ?? investigation.title);
  const chatUrl =
    services.application?.getUrlForApp('agent_builder', {
      path: `/conversations/${investigation.conversation_id}`,
    }) ?? '#';

  return (
    <EuiPanel
      hasBorder
      paddingSize="m"
      onClick={() => onSelect(investigation)}
      css={css`
        cursor: pointer;
        &:hover {
          background-color: ${euiTheme.colors.lightestShade};
        }
      `}
    >
      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
        <EuiFlexItem grow>
          <EuiText size="s">
            <strong>{investigation.title}</strong>
          </EuiText>
          {summary ? (
            <EuiText size="xs" color="subdued">
              <p>{summary}</p>
            </EuiText>
          ) : null}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {formatRelativeTime(investigation.updated_at)}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <span
                  css={css`
                    display: inline-block;
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background-color: ${watch.color};
                  `}
                  aria-hidden
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <span>WATCHED BY {watch.label}</span>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="comment"
            aria-label={`Open conversation ${investigation.conversation_id}`}
            href={chatUrl}
            target="_blank"
            color="primary"
            onClick={(event) => event.stopPropagation()}
            css={css`
              &:hover {
                background-color: ${euiTheme.colors.lightestShade};
              }
            `}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
