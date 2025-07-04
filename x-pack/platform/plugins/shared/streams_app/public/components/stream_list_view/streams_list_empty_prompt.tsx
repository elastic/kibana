/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiButton,
  EuiLink,
} from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';
import { AssetImage } from '../asset_image';
import { useKibana } from '../../hooks/use_kibana';

interface Props {
  onAddData?: () => void;
}

export const StreamsListEmptyPrompt: React.FC<Props> = ({ onAddData }) => {
  const {
    core: { docLinks },
  } = useKibana();
  const streamsDocsLink = docLinks.links.observability.logsStreams;

  return (
    <EuiFlexGroup justifyContent="center" alignItems="center">
      <EuiPanel
        paddingSize="none"
        hasBorder
        css={{
          maxWidth: 760,
          border: `${euiThemeVars.euiBorderWidthThin} solid ${euiThemeVars.euiBorderColor}`,
          borderRadius: euiThemeVars.euiBorderRadius,
        }}
      >
        <EuiFlexItem css={{ padding: euiThemeVars.euiSizeL }}>
          <EuiFlexGroup gutterSize="xl" alignItems="center">
            <EuiFlexItem
              grow={9}
              css={{
                paddingTop: euiThemeVars.euiSizeL,
                paddingBottom: euiThemeVars.euiSizeL,
              }}
            >
              <EuiTitle size="m">
                <EuiText>
                  {i18n.translate('xpack.streams.emptyState.title', {
                    defaultMessage: 'Turn raw data into structured, manageable streams',
                  })}
                </EuiText>
              </EuiTitle>
              <EuiSpacer size="m" />
              <EuiText size="m">
                {i18n.translate('xpack.streams.emptyState.body', {
                  defaultMessage:
                    'Easily turn your data into clear, structured flows with simple tools for routing, field extraction, and retention. Just stream it into Elastic to get started and your new streams will appear here.',
                })}
              </EuiText>
              <EuiSpacer size="m" />
              <EuiButton
                fill
                minWidth={false}
                css={{
                  padding: `${euiThemeVars.euiSizeM} ${euiThemeVars.euiSizeL}`,
                  alignSelf: 'flex-start',
                  fontWeight: 'normal',
                  marginTop: euiThemeVars.euiSizeS,
                }}
                onClick={onAddData}
              >
                {i18n.translate('xpack.streams.emptyState.addDataButton', {
                  defaultMessage: 'Add data',
                })}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={10}>
              <AssetImage type="addStreams" />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem
          css={{
            backgroundColor: euiThemeVars.euiColorBackgroundBaseSubdued,
            padding: euiThemeVars.euiSizeL,
            borderBottomLeftRadius: euiThemeVars.euiBorderRadius,
            borderBottomRightRadius: euiThemeVars.euiBorderRadius,
            border: 'none',
          }}
        >
          <EuiText size="s" css={{ fontWeight: euiThemeVars.euiFontWeightMedium }}>
            {i18n.translate('xpack.streams.emptyState.learnMore', {
              defaultMessage: 'Want to learn more? ',
            })}
            <EuiLink href={streamsDocsLink} target="_blank">
              {i18n.translate('xpack.streams.emptyState.learnMore.link', {
                defaultMessage: ' Read our Streams documentation',
              })}
            </EuiLink>
          </EuiText>
        </EuiFlexItem>
      </EuiPanel>
    </EuiFlexGroup>
  );
};
