/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiTitle, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

interface SettingTitleProps {
  title: string;
  isUnsaved: boolean;
  heading?: 'h3' | 'h4';
  'data-test-subj'?: string;
}

const UNSAVED_LABEL = i18n.translate('xpack.searchInferenceEndpoints.settings.unsavedIconLabel', {
  defaultMessage: 'Unsaved',
});

/**
 * Setting row title that mirrors the Advanced Settings unsaved marker: a warning-colored
 * bar on the left of the title plus an "Unsaved" dot once the row has pending changes.
 */
export const SettingTitle: React.FC<SettingTitleProps> = ({
  title,
  isUnsaved,
  heading: Heading = 'h3',
  'data-test-subj': dataTestSubj,
}) => {
  const {
    euiTheme: { size, colors },
  } = useEuiTheme();

  const unsavedTitleCss = css`
    padding-left: ${size.s};
    margin-left: -${size.s};
    ${isUnsaved ? `box-shadow: -${size.xs} 0 ${colors.warning};` : ''}
  `;

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false} css={unsavedTitleCss}>
        <EuiTitle size="xs">
          <Heading data-test-subj={dataTestSubj}>{title}</Heading>
        </EuiTitle>
      </EuiFlexItem>
      {isUnsaved && (
        <EuiFlexItem
          grow={false}
          data-test-subj={dataTestSubj ? `${dataTestSubj}-unsaved` : undefined}
        >
          <EuiIconTip
            type="dot"
            color="warning"
            aria-label={UNSAVED_LABEL}
            content={UNSAVED_LABEL}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
