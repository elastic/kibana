/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

import { EuiLink, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnWarningCallout } from '@kbn/ui-callout';

import { useDocumentationLinks, useRefreshTransformList } from '../../../hooks';
import { useEnabledFeatures } from '../../../serverless_context';

interface TransformNodesWarningProps {
  transformNodes: number;
}

export const TransformNodesWarning: FC<TransformNodesWarningProps> = ({ transformNodes }) => {
  const { showNodeInfo } = useEnabledFeatures();
  const refreshTransformList = useRefreshTransformList();
  const { esNodeRoles } = useDocumentationLinks();

  if (!showNodeInfo || transformNodes > 0) {
    return null;
  }

  return (
    <>
      <KbnWarningCallout
        announceOnMount
        title={
          <FormattedMessage
            id="xpack.transform.transformNodes.noTransformNodesCallOutTitle"
            defaultMessage="There are no transform nodes available."
          />
        }
        text={
          <p>
            <FormattedMessage
              id="xpack.transform.transformNodes.noTransformNodesCallOutBody"
              defaultMessage="You will not be able to create or run transforms. {learnMoreLink}"
              values={{
                learnMoreLink: (
                  <EuiLink href={esNodeRoles} target="_blank">
                    <FormattedMessage
                      id="xpack.transform.transformNodes.noTransformNodesLearnMoreLinkText"
                      defaultMessage="Learn more"
                    />
                  </EuiLink>
                ),
              }}
            />
          </p>
        }
        actionProps={{
          primary: {
            onClick: () => refreshTransformList(),
            children: (
              <FormattedMessage
                id="xpack.transform.transformNodes.noTransformNodesRetryButtonText"
                defaultMessage="Retry"
              />
            ),
          },
        }}
      />
      <EuiSpacer size="s" />
    </>
  );
};
