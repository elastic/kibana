/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink, EuiSpacer } from '@elastic/eui';
import type { FunctionComponent } from 'react';
import React from 'react';

import type { CoreStart } from '@kbn/core/public';
import { type ICPSManager, useIsCpsMultiProject } from '@kbn/cps-utils';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { KbnInfoCallout } from '@kbn/ui-callout';

export interface ApiKeysCpsCalloutProps {
  cpsManager?: ICPSManager;
}

/**
 * Informs users on serverless projects with linked projects that Elasticsearch API keys created on
 * this page cannot be used for cross-project search, pointing them to Elastic Cloud API keys instead.
 *
 * Nothing is rendered when CPS is unavailable or there are no linked projects. Pending readiness
 * (`undefined`) is treated as falsy so the callout stays hidden until the manager is ready.
 */
export const ApiKeysCpsCallout: FunctionComponent<ApiKeysCpsCalloutProps> = ({ cpsManager }) => {
  const { services } = useKibana<CoreStart>();
  const hasLinkedProjects = useIsCpsMultiProject(cpsManager);

  if (!hasLinkedProjects) {
    return null;
  }

  return (
    <>
      <KbnInfoCallout
        announceOnMount
        title={i18n.translate('xpack.security.management.apiKeys.cpsCallout.title', {
          defaultMessage: 'Elasticsearch API keys are limited to this project',
        })}
        data-test-subj="apiKeysCpsCallout"
        text={
          <FormattedMessage
            id="xpack.security.management.apiKeys.cpsCallout.description"
            defaultMessage="Keys created on this page don't work with cross-project search. They return results from this project only. To search across linked projects programmatically, create an Elastic Cloud API key with Elasticsearch and Kibana API access. {learnMoreLink}"
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
                    defaultMessage="Learn more"
                  />
                </EuiLink>
              ),
            }}
          />
        }
      />
      <EuiSpacer />
    </>
  );
};
