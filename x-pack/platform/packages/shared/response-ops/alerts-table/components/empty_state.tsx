/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React from 'react';
import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiText,
  EuiTitle,
  EuiButton,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EsQuerySnapshot } from '@kbn/alerting-types';
import { css } from '@emotion/react';
import type { SortCombinations } from '@elastic/elasticsearch/lib/api/types';
import icon from '../assets/illustration_product_no_results_magnifying_glass.svg';
import { AlertsQueryInspector } from './alerts_query_inspector';
import { ALERTS_TABLE_TITLE } from '../translations';
import type { AlertsTableProps } from '../types';

const heights = {
  tall: 490,
  short: 250,
};

const panelStyle = {
  maxWidth: 500,
};

const textStyle = css`
  word-break: break-word;
`;

type EmptyState = NonNullable<AlertsTableProps['emptyState' | 'errorState']>;
type EmptyStateMessage = Pick<EmptyState, 'messageTitle' | 'messageBody'>;

export const EmptyState: React.FC<
  {
    height?: keyof typeof heights | 'flex';
    variant?: 'subdued' | 'transparent';
    additionalToolbarControls?: ReactNode;
    alertsQuerySnapshot?: EsQuerySnapshot;
    showInspectButton?: boolean;
    error?: Error;
    fieldWithSortingError?: SortCombinations;
    onReset?: () => void;
  } & EmptyStateMessage
> = ({
  height = 'tall',
  variant = 'subdued',
  messageTitle,
  messageBody,
  additionalToolbarControls,
  alertsQuerySnapshot,
  showInspectButton,
  error,
  fieldWithSortingError,
  onReset,
}) => {
  const renderErrorState = () => (
    <EuiFlexItem>
      <EuiText color="danger" css={textStyle}>
        {error?.message}
      </EuiText>
      <EuiSpacer size="m" />

      {onReset ? (
        <EuiFlexGroup justifyContent="flexStart">
          <EuiFlexItem grow={false}>
            <EuiButton onClick={onReset} size="m" data-test-subj="resetButton">
              <FormattedMessage
                id="xpack.triggersActionsUI.empty.resetButton"
                defaultMessage={fieldWithSortingError ? 'Reset sort' : 'Reset'}
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        ''
      )}
    </EuiFlexItem>
  );

  const renderEmptyState = () => (
    <EuiFlexItem>
      <EuiText size="s">
        <EuiTitle>
          <h3>
            {messageTitle ? (
              messageTitle
            ) : (
              <FormattedMessage
                id="xpack.triggersActionsUI.empty.title"
                defaultMessage={'No results match your search criteria'}
              />
            )}
          </h3>
        </EuiTitle>
        <p>
          {messageBody ? (
            messageBody
          ) : (
            <FormattedMessage
              id="xpack.triggersActionsUI.empty.description"
              defaultMessage={'Try searching over a longer period of time or modifying your search'}
            />
          )}
        </p>
      </EuiText>
    </EuiFlexItem>
  );
  return (
    <EuiPanel color={variant} data-test-subj="alertsTableEmptyState">
      <EuiFlexGroup
        direction="column"
        css={css`
          height: 100%;
        `}
      >
        {(showInspectButton || additionalToolbarControls) && (
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="flexEnd" justifyContent="flexEnd">
              {showInspectButton && alertsQuerySnapshot && (
                <EuiFlexItem grow={false}>
                  <AlertsQueryInspector
                    alertsQuerySnapshot={alertsQuerySnapshot}
                    inspectTitle={ALERTS_TABLE_TITLE}
                  />
                </EuiFlexItem>
              )}
              {additionalToolbarControls && (
                <EuiFlexItem grow={false}>{additionalToolbarControls}</EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
        )}

        <EuiFlexItem
          grow={height === 'flex'}
          css={height !== 'flex' ? { height: heights[height] } : undefined}
        >
          <EuiFlexGroup alignItems="center" justifyContent="center">
            <EuiFlexItem grow={false}>
              <EuiPanel hasBorder={variant === 'subdued'} css={panelStyle} hasShadow={false}>
                <EuiFlexGroup alignItems={variant === 'transparent' ? 'center' : 'flexStart'}>
                  {error ? renderErrorState() : renderEmptyState()}
                  <EuiFlexItem grow={false}>
                    <EuiImage css={{ width: 200, height: 148 }} size="200" alt="" url={icon} />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
