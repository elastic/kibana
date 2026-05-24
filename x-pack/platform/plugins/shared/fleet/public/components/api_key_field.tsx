/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiToolTip,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';

import { useStartServices } from '../hooks';

const TOKEN_MASK = '•'.repeat(24);

export const ApiKeyField: React.FunctionComponent<{
  apiKeyId: string;
  getToken: (id: string) => Promise<string>;
}> = ({ apiKeyId, getToken }) => {
  const { euiTheme } = useEuiTheme();
  const { notifications } = useStartServices();
  const [state, setState] = useState<'VISIBLE' | 'HIDDEN' | 'LOADING'>('HIDDEN');
  const [key, setKey] = useState<string | undefined>();

  const fetchKey = async () => {
    try {
      setState('LOADING');
      const fetchedKey = await getToken(apiKeyId);
      setKey(fetchedKey);
      setState('VISIBLE');
      return fetchedKey;
    } catch (err) {
      notifications.toasts.addError(err as Error, {
        title: 'Error',
      });
      setState('HIDDEN');
    }
  };

  const toggleKey = async () => {
    if (state === 'VISIBLE') {
      setState('HIDDEN');
    } else if (state === 'HIDDEN') {
      await fetchKey();
    }
  };

  const copyToken = async () => {
    let tokenToCopy = key;
    if (!tokenToCopy) {
      tokenToCopy = await fetchKey();
    }
    if (tokenToCopy) {
      navigator.clipboard.writeText(tokenToCopy);
      notifications.toasts.addSuccess({
        title: i18n.translate('xpack.fleet.enrollmentTokensList.tokenCopied', {
          defaultMessage: 'Token copied to clipboard',
        }),
        toastLifeTimeMs: 2000,
      });
    }
  };

  return (
    <EuiFlexGroup alignItems="center" gutterSize="xs">
      <EuiFlexItem grow={false}>
        <EuiText
          color="subdued"
          size="xs"
          css={css`
            font-family: ${euiTheme.font.familyCode};
          `}
          data-test-subj="apiKeyField"
        >
          {state === 'VISIBLE' ? key : TOKEN_MASK}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiToolTip
          content={
            state === 'VISIBLE'
              ? i18n.translate('xpack.fleet.enrollmentTokensList.hideTokenButtonLabel', {
                  defaultMessage: 'Hide token',
                })
              : i18n.translate('xpack.fleet.enrollmentTokensList.showTokenButtonLabel', {
                  defaultMessage: 'Show token',
                })
          }
          disableScreenReaderOutput
        >
          <EuiButtonIcon
            aria-label={
              state === 'VISIBLE'
                ? i18n.translate('xpack.fleet.enrollmentTokensList.hideTokenButtonLabel', {
                    defaultMessage: 'Hide token',
                  })
                : i18n.translate('xpack.fleet.enrollmentTokensList.showTokenButtonLabel', {
                    defaultMessage: 'Show token',
                  })
            }
            color="text"
            onClick={toggleKey}
            iconType={state === 'VISIBLE' ? 'eyeSlash' : 'eye'}
            data-test-subj="showHideTokenButton"
          />
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiToolTip
          content={i18n.translate('xpack.fleet.enrollmentTokensList.copyTokenButtonLabel', {
            defaultMessage: 'Copy token',
          })}
          disableScreenReaderOutput
        >
          <EuiButtonIcon
            aria-label={i18n.translate('xpack.fleet.enrollmentTokensList.copyTokenButtonLabel', {
              defaultMessage: 'Copy token',
            })}
            color="text"
            onClick={copyToken}
            iconType="copy"
            data-test-subj="copyTokenButton"
          />
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
