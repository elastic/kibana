/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiLink, EuiSpacer } from '@elastic/eui';
import type { FunctionComponent } from 'react';
import React, { useEffect, useState } from 'react';

import type { CoreStart } from '@kbn/core/public';
import type { ICPSManager } from '@kbn/cps-utils';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';

export interface ApiKeysCpsCalloutProps {
  cpsManager?: ICPSManager;
}

/**
 * Informs users on serverless projects with linked projects that Elasticsearch API keys created on
 * this page cannot be used for cross-project search, pointing them to Elastic Cloud API keys instead.
 *
 * `hasLinkedProjects()` reflects data fetched during `whenReady()`, so this component awaits that
 * before reading it. Nothing is rendered when CPS is unavailable or there are no linked projects.
 */
export const ApiKeysCpsCallout: FunctionComponent<ApiKeysCpsCalloutProps> = ({ cpsManager }) => {
  const { services } = useKibana<CoreStart>();
  const [hasLinkedProjects, setHasLinkedProjects] = useState(false);

  useEffect(() => {
    if (!cpsManager) {
      return;
    }

    let isMounted = true;

    cpsManager
      .whenReady()
      .then(() => {
        if (isMounted) {
          setHasLinkedProjects(cpsManager.hasLinkedProjects());
        }
      })
      .catch(() => {
        if (isMounted) {
          setHasLinkedProjects(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [cpsManager]);

  if (!hasLinkedProjects) {
    return null;
  }

  return (
    <>
      <EuiCallOut
        announceOnMount
        color="primary"
        iconType="info"
        title={i18n.translate('xpack.security.management.apiKeys.cpsCallout.title', {
          defaultMessage: "Elasticsearch API keys don't work across linked projects",
        })}
        data-test-subj="apiKeysCpsCallout"
      >
        <FormattedMessage
          id="xpack.security.management.apiKeys.cpsCallout.description"
          defaultMessage="API keys created on this page are Elasticsearch API keys and can't be used for cross-project search across this project's linked projects. To programmatically access linked projects, use an Elastic Cloud API key instead. {learnMoreLink}"
          values={{
            learnMoreLink: (
              <EuiLink
                href={services.docLinks.links.security.elasticCloudApiKeys}
                target="_blank"
                external
                data-test-subj="apiKeysCpsCalloutLearnMoreLink"
              >
                <FormattedMessage
                  id="xpack.security.management.apiKeys.cpsCallout.learnMoreLinkText"
                  defaultMessage="Learn more about Elastic Cloud API keys"
                />
              </EuiLink>
            ),
          }}
        />
      </EuiCallOut>
      <EuiSpacer />
    </>
  );
};
