/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { EuiText, EuiLink, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import semverMajor from 'semver/functions/major';
import semverMinor from 'semver/functions/minor';
import semverPatch from 'semver/functions/patch';

import { useKibanaVersion, useStartServices } from '../../hooks';

import type { K8sMode } from './types';

interface Props {
  isK8s?: K8sMode;
  isManaged?: boolean;
}

export const InstallationMessage: React.FunctionComponent<Props> = ({
  isK8s,
  isManaged = true,
}) => {
  const { docLinks } = useStartServices();
  const kibanaVersion = useKibanaVersion();
  const kibanaVersionURLString = useMemo(
    () =>
      `${semverMajor(kibanaVersion)}-${semverMinor(kibanaVersion)}-${semverPatch(kibanaVersion)}`,
    [kibanaVersion]
  );

  return (
    <>
      {isK8s !== 'IS_KUBERNETES_MULTIPAGE' && (
        <EuiText>
          <FormattedMessage
            id="xpack.fleet.enrollmentInstructions.installationMessage"
            defaultMessage="Select the appropriate platform and run commands to install, enroll, and start Elastic Agent. Reuse commands to set up agents on more than one host. All builds can be found on our {downloadLink}. For additional guidance, see our {installationLink}."
            values={{
              downloadLink: (
                <EuiLink
                  target="_blank"
                  external
                  href={`https://www.elastic.co/downloads/past-releases/elastic-agent-${kibanaVersionURLString}`}
                >
                  <FormattedMessage
                    id="xpack.fleet.enrollmentInstructions.downloadLink"
                    defaultMessage="downloads page"
                  />
                </EuiLink>
              ),
              installationLink: (
                <EuiLink
                  target="_blank"
                  external
                  href={
                    isManaged
                      ? docLinks.links.fleet.installElasticAgent
                      : docLinks.links.fleet.installElasticAgentStandalone
                  }
                >
                  <FormattedMessage
                    id="xpack.fleet.enrollmentInstructions.installationMessage.link"
                    defaultMessage="installation docs"
                  />
                </EuiLink>
              ),
            }}
          />
        </EuiText>
      )}
      {isK8s === 'IS_KUBERNETES_MULTIPAGE' && (
        <EuiText>
          <FormattedMessage
            id="xpack.fleet.enrollmentInstructions.k8sInstallationMessage"
            defaultMessage="The below manifest has been automatically generated and includes credentials for this instance of Elastic Agent to be centrally managed using Fleet once it gets running in your Kubernetes cluster."
          />
        </EuiText>
      )}
      <EuiSpacer size="l" />
    </>
  );
};
