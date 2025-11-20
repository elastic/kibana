/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel, EuiTitle, EuiText, EuiFlexItem, EuiSpacer, EuiFlexGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { AssetImage } from '../../../asset_image';

export function SuggestPipelinePanel({ children }: React.PropsWithChildren) {
  return (
    <EuiPanel
      hasBorder
      grow={false}
      css={css`
        text-align: left;
      `}
      paddingSize="l"
    >
      <EuiFlexGroup gutterSize="l">
        <EuiFlexItem>
          <EuiTitle size="m">
            <h4>
              {i18n.translate('xpack.streams.stepsEditor.h3.suggestAPipelineLabel', {
                defaultMessage: 'Suggest a pipeline',
              })}
            </h4>
          </EuiTitle>
          <EuiText size="m">
            {i18n.translate('xpack.streams.stepsEditor.useThePowerOfTextLabel', {
              defaultMessage: 'Use the power of AI to generate the most effective pipeline',
            })}
          </EuiText>
          <EuiSpacer size="m" />
          {children}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <AssetImage type="suggestPipeline" size="xs" />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
