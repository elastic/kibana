/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiLink, EuiPanel, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { useStreamDetail } from '../../hooks/use_stream_detail';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';

export function AttachedAssetsPanel() {
  const { definition } = useStreamDetail();
  const router = useStreamsAppRouter();

  const attachmentsHref = router.link('/{key}/management/{tab}', {
    path: { key: definition.stream.name, tab: 'attachments' },
  });

  return (
    <EuiPanel hasBorder paddingSize="m">
      <EuiTitle size="xs">
        <h2>
          {i18n.translate('xpack.streams.streamOverview.attachedAssetsPanel.title', {
            defaultMessage: 'Attached assets',
          })}
        </h2>
      </EuiTitle>

      <EuiSpacer size="s" />

      <EuiText size="s" color="subdued">
        <FormattedMessage
          id="xpack.streams.streamOverview.attachedAssetsPanel.contentLabel"
          defaultMessage="{attachLink} to centralize all relevant dashboards, SLOs, rules, alerts, or other tools related to this stream."
          values={{
            attachLink: (
              <EuiLink href={attachmentsHref}>
                {i18n.translate(
                  'xpack.streams.streamOverview.attachedAssetsPanel.attachLinkLabel',
                  {
                    defaultMessage: 'Attach existing assets',
                  }
                )}
              </EuiLink>
            ),
          }}
        />
      </EuiText>
    </EuiPanel>
  );
}
