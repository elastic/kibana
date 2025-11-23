/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiText,
  EuiButton,
  EuiButtonEmpty,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../hooks/use_kibana';
import { AssetImage } from '../asset_image';

export function WelcomePanel() {
  const {
    core: { docLinks },
  } = useKibana();
  const [isDismissed, setIsDismissed] = useLocalStorage('streamsWelcomePanelDismissed', false);

  if (isDismissed) {
    return null;
  }
  return (
    <>
      <EuiPanel hasBorder={true} paddingSize="m" color="subdued" grow={false} borderRadius="m">
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <AssetImage type="yourPreviewWillAppearHere" size="s" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup alignItems="flexStart" direction="column" gutterSize="xs">
              <EuiFlexItem>
                <EuiTitle size="xs">
                  <h4>
                    {i18n.translate('xpack.streams.streamsListView.welcomeTitle', {
                      defaultMessage: 'Welcome to Streams',
                    })}
                  </h4>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="s" color="subdued">
                  {i18n.translate('xpack.streams.streamsListView.welcomeDescription', {
                    defaultMessage:
                      'Use Streams to organize and process your data into clear structured flows, and simplify routing, field extraction, and retention management.',
                  })}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFlexGroup direction="row" gutterSize="xs" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      color="primary"
                      size="s"
                      href={docLinks.links.observability.logsStreams}
                      target="_blank"
                      rel="noopener"
                    >
                      {i18n.translate('xpack.streams.streamsListView.learnMoreButtonLabel', {
                        defaultMessage: 'Go to docs',
                      })}
                    </EuiButton>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiButtonEmpty
                      color="text"
                      size="s"
                      onClick={() => setIsDismissed(true)}
                      aria-label={i18n.translate(
                        'xpack.streams.streamsListView.dismissWelcomeButtonLabel',
                        {
                          defaultMessage: 'Dismiss welcome panel',
                        }
                      )}
                    >
                      {i18n.translate('xpack.streams.streamsListView.learnMoreButtonLabel', {
                        defaultMessage: 'Hide this',
                      })}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
      <EuiSpacer size="l" />
    </>
  );
}
