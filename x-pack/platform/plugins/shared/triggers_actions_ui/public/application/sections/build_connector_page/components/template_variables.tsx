/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useState } from 'react';
import {
  copyToClipboard,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useFormContext, useWatch } from 'react-hook-form';
import type { BuildConnectorFormData, ConnectorTypeField } from '../types';

interface Props {
  /** Index of the action whose `input` fields can be referenced; omitted for the connection test. */
  actionIndex?: number;
  testSubj: string;
}

const EMPTY_FIELDS: ConnectorTypeField[] = [];

const LABELS = {
  title: i18n.translate('xpack.triggersActionsUI.sections.buildConnectorPage.variables.title', {
    defaultMessage: 'Variables',
  }),
  copy: i18n.translate('xpack.triggersActionsUI.sections.buildConnectorPage.variables.copy', {
    defaultMessage: 'Click to copy',
  }),
  copied: i18n.translate('xpack.triggersActionsUI.sections.buildConnectorPage.variables.copied', {
    defaultMessage: 'Copied',
  }),
};

const toTokens = (prefix: string, fields: ConnectorTypeField[] | undefined): string[] =>
  (fields ?? []).flatMap(({ name }) => (name?.trim() ? [`{{${prefix}.${name.trim()}}}`] : []));

const TokenBadge: React.FC<{ token: string; testSubj: string }> = ({ token, testSubj }) => {
  const [isCopied, setIsCopied] = useState(false);
  const onClick = useCallback(() => {
    copyToClipboard(token);
    setIsCopied(true);
  }, [token]);

  return (
    <EuiToolTip
      content={isCopied ? LABELS.copied : LABELS.copy}
      onMouseOut={() => setIsCopied(false)}
      disableScreenReaderOutput
    >
      <EuiBadge
        color="hollow"
        onClick={onClick}
        onClickAriaLabel={`${LABELS.copy}: ${token}`}
        data-test-subj={testSubj}
      >
        <code>{token}</code>
      </EuiBadge>
    </EuiToolTip>
  );
};

/** The `{{config.*}}` and `{{input.*}}` references a request can use, built from the defined fields. */
const TemplateVariablesComponent: React.FC<Props> = ({ actionIndex, testSubj }) => {
  const { control } = useFormContext<BuildConnectorFormData>();
  const [config, actions] = useWatch({ control, name: ['config', 'actions'] });
  const input = actionIndex === undefined ? EMPTY_FIELDS : actions?.[actionIndex]?.input;
  const tokens = [...new Set([...toTokens('config', config), ...toTokens('input', input)])];

  if (tokens.length === 0) {
    return null;
  }

  return (
    <EuiFlexGroup
      gutterSize="xs"
      alignItems="center"
      wrap
      responsive={false}
      data-test-subj={testSubj}
    >
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued">
          {LABELS.title}
        </EuiText>
      </EuiFlexItem>
      {tokens.map((token) => (
        <EuiFlexItem grow={false} key={token}>
          <TokenBadge token={token} testSubj={`${testSubj}-${token}`} />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};

export const TemplateVariables = memo(TemplateVariablesComponent);
