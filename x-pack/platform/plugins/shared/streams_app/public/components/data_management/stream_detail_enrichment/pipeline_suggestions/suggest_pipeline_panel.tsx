/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiPanel,
  EuiTitle,
  EuiText,
  EuiFlexItem,
  EuiSpacer,
  EuiFlexGroup,
  EuiBetaBadge,
} from '@elastic/eui';
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
      data-test-subj="streamsAppSuggestPipelinePanel"
    >
      <EuiFlexGroup gutterSize="l">
        <EuiFlexItem>
          <EuiTitle size="m">
            <h4>
              <EuiFlexGroup alignItems="center" gutterSize="s" wrap>
                <EuiFlexItem grow={false}>
                  {i18n.translate('xpack.streams.stepsEditor.h3.suggestAPipelineLabel', {
                    defaultMessage: 'Suggest a pipeline',
                  })}
                </EuiFlexItem>
                <EuiBetaBadge
                  label={i18n.translate(
                    'xpack.streams.stepsEditor.pipelineSuggestion.betaBadgeLabel',
                    {
                      defaultMessage: 'Technical Preview',
                    }
                  )}
                  tooltipContent={i18n.translate(
                    'xpack.streams.stepsEditor.pipelineSuggestion.betaBadgeLabel.betaBadgeDescription',
                    {
                      defaultMessage:
                        'This functionality is experimental and not supported. It may change or be removed at any time.',
                    }
                  )}
                  alignment="middle"
                  size="s"
                />
              </EuiFlexGroup>
            </h4>
          </EuiTitle>
          <EuiText size="m">
            {i18n.translate('xpack.streams.stepsEditor.useThePowerOfTextLabel', {
              defaultMessage: 'Use the power of AI to generate the most effective pipeline',
            })}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <AssetImage type="suggestPipeline" size={100} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {children}
    </EuiPanel>
  );
}
