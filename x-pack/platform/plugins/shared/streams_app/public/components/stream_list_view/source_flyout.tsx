/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiHealth,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import { getSourceMockMetadata } from './source_mock_metadata';

export function SourceFlyout({
  sourceName,
  onClose,
}: {
  sourceName: string;
  onClose: () => void;
}) {
  const titleId = useGeneratedHtmlId({ prefix: 'sourceFlyoutTitle' });
  const meta = getSourceMockMetadata(sourceName);

  return (
    <EuiFlyout size="s" onClose={onClose} aria-labelledby={titleId} data-test-subj="sourceFlyout">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={titleId}>{sourceName}</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          {meta.description}
        </EuiText>
        <EuiSpacer size="s" />
        {meta.isHealthy ? (
          <EuiHealth color="success">
            {i18n.translate('xpack.streams.sourceFlyout.healthy', {
              defaultMessage: 'Healthy',
            })}
          </EuiHealth>
        ) : (
          <EuiHealth color="warning">
            {i18n.translate('xpack.streams.sourceFlyout.degraded', {
              defaultMessage: 'Degraded',
            })}
          </EuiHealth>
        )}
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiPanel
          color="subdued"
          hasShadow={false}
          hasBorder={false}
          className={css`
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 160px;
          `}
        >
          <EuiText color="subdued">
            {i18n.translate('xpack.streams.sourceFlyout.placeholder', {
              defaultMessage: 'placeholder',
            })}
          </EuiText>
        </EuiPanel>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} flush="left" data-test-subj="sourceFlyoutCloseButton">
              {i18n.translate('xpack.streams.sourceFlyout.close', {
                defaultMessage: 'Close',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" responsive={false} justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiButton color="danger" size="s" data-test-subj="sourceFlyoutDeleteButton">
                  {i18n.translate('xpack.streams.sourceFlyout.delete', {
                    defaultMessage: 'Delete',
                  })}
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton fill size="s" data-test-subj="sourceFlyoutEditConfigButton">
                  {i18n.translate('xpack.streams.sourceFlyout.editConfig', {
                    defaultMessage: 'Edit config',
                  })}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
