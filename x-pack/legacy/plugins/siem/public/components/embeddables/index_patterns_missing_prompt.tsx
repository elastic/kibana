/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION } from 'ui/documentation_links';
import { EuiButton, EuiEmptyPrompt, EuiLink } from '@elastic/eui';

import * as React from 'react';
import chrome from 'ui/chrome';

import * as i18n from './translations';

interface DocMapping {
  beat: string;
  docLink: string;
}

export const IndexPatternsMissingPrompt = React.memo(() => {
  const beatsSetupDocMapping: DocMapping[] = [
    {
      beat: 'auditbeat',
      docLink: `${ELASTIC_WEBSITE_URL}/guide/en/beats/auditbeat/${DOC_LINK_VERSION}/load-kibana-dashboards.html`,
    },
    {
      beat: 'filebeat',
      docLink: `${ELASTIC_WEBSITE_URL}/guide/en/beats/filebeat/${DOC_LINK_VERSION}/load-kibana-dashboards.html`,
    },
    {
      beat: 'packetbeat',
      docLink: `${ELASTIC_WEBSITE_URL}/guide/en/beats/packetbeat/${DOC_LINK_VERSION}/load-kibana-dashboards.html`,
    },
    {
      beat: 'winlogbeat',
      docLink: `${ELASTIC_WEBSITE_URL}/guide/en/beats/winlogbeat/${DOC_LINK_VERSION}/load-kibana-dashboards.html`,
    },
  ];

  return (
    <EuiEmptyPrompt
      iconType="gisApp"
      title={<h2>{i18n.ERROR_TITLE}</h2>}
      titleSize="xs"
      body={
        <>
          <p>{i18n.ERROR_DESCRIPTION}</p>

          <p>
            {beatsSetupDocMapping
              .map<React.ReactNode>(v => (
                <EuiLink key={v.beat} href={v.docLink} target="blank">
                  {`${v.beat}-*`}
                </EuiLink>
              ))
              .reduce((acc, v) => [acc, ', ', v])}
          </p>
        </>
      }
      actions={
        <EuiButton
          href={`${chrome.getBasePath()}/app/kibana#/management/kibana/index_patterns`}
          color="primary"
          target="_blank"
          fill
        >
          {i18n.ERROR_BUTTON}
        </EuiButton>
      }
    />
  );
});
