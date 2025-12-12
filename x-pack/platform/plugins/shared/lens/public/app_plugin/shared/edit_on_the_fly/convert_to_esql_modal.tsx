/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { EuiConfirmModalProps } from '@elastic/eui';
import { EuiCallOut, EuiCodeBlock, EuiConfirmModal, EuiLink, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export function ConverToEsqlModal({
  onCancel,
  queries,
}: {
  onCancel: EuiConfirmModalProps['onCancel'];
  queries: Record<string, string>;
}) {
  const queryCount = Object.keys(queries).length;

  return (
    <EuiConfirmModal
      aria-label={i18n.translate('xpack.lens.config.switchToQueryModeAriaLabel', {
        defaultMessage: 'Switch to Query mode',
      })}
      title={i18n.translate('xpack.lens.config.switchToQueryModeTitle', {
        defaultMessage: 'Switch to Query mode',
      })}
      onCancel={onCancel}
      cancelButtonText={i18n.translate('xpack.lens.config.cancelButtonTextButtonLabel', {
        defaultMessage: 'Cancel',
      })}
      confirmButtonText={i18n.translate('xpack.lens.config.switchToQueryModeButtonLabel', {
        defaultMessage: 'Switch to query mode',
      })}
    >
      <p>
        {i18n.translate('xpack.lens.config.queryModeDescription', {
          defaultMessage: 'Query mode enables advanced data analysis with ES|QL.',
        })}{' '}
        <EuiLink href="" target="_blank" external={false}>
          {i18n.translate('xpack.lens.config.readMoreLinkText', {
            defaultMessage: 'Read more.',
          })}
        </EuiLink>
      </p>

      <EuiCallOut
        color="warning"
        iconType="warning"
        size="s"
        title={i18n.translate('xpack.lens.config.queryModeWarningDescription', {
          defaultMessage: 'Once query mode is activated you cannot switch back to visual mode.',
        })}
      />

      <EuiSpacer size="l" />

      {queryCount === 1 ? (
        <EuiCodeBlock isCopyable>{Object.entries(queries)[0][1]}</EuiCodeBlock>
      ) : null}
    </EuiConfirmModal>
  );
}
