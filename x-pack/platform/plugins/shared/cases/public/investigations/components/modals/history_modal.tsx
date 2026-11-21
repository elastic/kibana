/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useQuery } from '@kbn/react-query';
import type { ChangeHistoryResponse } from '../../../../common/investigations/types';
import { getChangeHistory } from '../../api/client';
import { investigationKeys } from '../../api/query_keys';
import { ICONS } from '../../icons';
import { useInvestigationsServices } from '../../services';
import { ActorBadge } from '../shared/actor_badge';
import { EmptyState } from '../shared/empty_state';
import { ErrorState } from '../shared/error_state';
import { formatAbsoluteUtc } from '../shared/formatters';
import { LoadingState } from '../shared/loading_state';
import { RelativeTime } from '../shared/relative_time';
import type { InvestigationModalProps } from './modal_props';
import * as i18n from './translations';

type HistoryVersion = ChangeHistoryResponse['versions'][number];

interface VersionRow {
  version: HistoryVersion;
  isCurrent: boolean;
}

/** Newest first. The newest version of each kind of text (description, one conclusion...) is current. */
export const toVersionRows = (versions: HistoryVersion[]): VersionRow[] => {
  const newestFirst = [...versions].sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts));
  const seen = new Set<string>();
  return newestFirst.map((version) => {
    const isCurrent = !seen.has(version.what);
    seen.add(version.what);
    return { version, isCurrent };
  });
};

/** Every stored version of the description, conclusions and closing summary. */
export const HistoryModal: React.FC<InvestigationModalProps> = ({ record, onClose }) => {
  const { euiTheme } = useEuiTheme();
  const titleId = useGeneratedHtmlId();
  const { http } = useInvestigationsServices();

  const history = useQuery(
    [...investigationKeys.recordScope(record.id), 'history'],
    () => getChangeHistory(http, record.id),
    { retry: false, refetchOnMount: 'always' }
  );
  const rows = useMemo(() => toVersionRows(history.data?.versions ?? []), [history.data]);

  const body = (() => {
    if (history.isLoading) {
      return <LoadingState label={i18n.HISTORY_LOADING} />;
    }
    if (history.isError) {
      return (
        <ErrorState
          title={i18n.HISTORY_ERROR}
          error={history.error}
          onRetry={() => history.refetch()}
        />
      );
    }
    if (rows.length === 0) {
      return (
        <EmptyState
          iconType={ICONS.history}
          title={i18n.HISTORY_EMPTY_TITLE}
          body={i18n.HISTORY_EMPTY_BODY}
          data-test-subj="investigationHistoryEmpty"
        />
      );
    }
    return (
      <ol
        css={css`
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: ${euiTheme.size.s};
        `}
        data-test-subj="investigationHistoryList"
      >
        {rows.map(({ version, isCurrent }, index) => (
          <li
            key={`${version.ts}-${version.what}-${index}`}
            data-test-subj="investigationHistoryItem"
          >
            <EuiPanel hasShadow={false} hasBorder paddingSize="m">
              <EuiFlexGroup
                alignItems="flexStart"
                justifyContent="spaceBetween"
                gutterSize="m"
                responsive={false}
              >
                <EuiFlexItem grow={false}>
                  <ActorBadge actor={version.actor} />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued" textAlign="right">
                    <RelativeTime value={version.ts} />
                    <br />
                    {formatAbsoluteUtc(version.ts)}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="s" />
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow" data-test-subj="investigationHistoryWhat">
                    {version.what}
                  </EuiBadge>
                </EuiFlexItem>
                {isCurrent ? (
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="primary" data-test-subj="investigationHistoryCurrent">
                      {i18n.HISTORY_CURRENT}
                    </EuiBadge>
                  </EuiFlexItem>
                ) : null}
              </EuiFlexGroup>
              <EuiSpacer size="xs" />
              <EuiText
                size="s"
                css={css`
                  white-space: pre-wrap;
                  overflow-wrap: anywhere;
                `}
                data-test-subj="investigationHistoryText"
              >
                {version.text}
              </EuiText>
            </EuiPanel>
          </li>
        ))}
      </ol>
    );
  })();

  return (
    <EuiModal
      onClose={onClose}
      aria-labelledby={titleId}
      css={css`
        width: min(680px, 100%);
      `}
      data-test-subj="investigationHistoryModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>{i18n.HISTORY_TITLE}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText size="s" color="subdued">
          <p>{i18n.HISTORY_INTRO}</p>
        </EuiText>
        <EuiSpacer size="m" />
        {body}
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButton fill onClick={onClose} data-test-subj="investigationHistoryClose">
          {i18n.CLOSE_BUTTON}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
HistoryModal.displayName = 'HistoryModal';
