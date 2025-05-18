/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiCodeBlock,
  EuiSpacer,
  EuiSkeletonText,
  EuiCallOut,
  EuiLink,
  EuiCode,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';

import type { PackageInfo } from '../../../../../types';

import { useGetInputsTemplatesQuery, useStartServices } from '../../../../../hooks';
import { PrereleaseCallout } from '../overview/overview';

import { isPackagePrerelease } from '../../../../../../../../common/services';
import { SideBarColumn } from '../../../components/side_bar_column';

interface ConfigsProps {
  packageInfo: PackageInfo;
}

export const Configs: React.FC<ConfigsProps> = ({ packageInfo }) => {
  const { docLinks } = useStartServices();
  const { name: pkgName, version: pkgVersion, title: pkgTitle } = packageInfo;
  const notInstalled = packageInfo.status !== 'installing';

  const isPrerelease = isPackagePrerelease(packageInfo.version);
  const {
    data: configs,
    error,
    isLoading,
  } = useGetInputsTemplatesQuery(
    { pkgName, pkgVersion },
    { format: 'yaml', prerelease: isPrerelease }
  );

  return (
    <EuiFlexGroup data-test-subj="epm.Configs" alignItems="flexStart">
      <SideBarColumn grow={1} />
      {error ? (
        <EuiFlexItem grow={7}>
          <EuiCallOut
            data-test-subj="configsTab.errorCallout"
            title={
              <FormattedMessage
                id="xpack.fleet.epm.InputTemplates.errorTitle"
                defaultMessage="Unsupported"
              />
            }
            color="warning"
            iconType="alert"
          >
            <p>
              <FormattedMessage
                id="xpack.fleet.epm.InputTemplates.error"
                defaultMessage="This integration doesn't support automatic generation of sample configurations."
              />
            </p>
          </EuiCallOut>
        </EuiFlexItem>
      ) : (
        <EuiFlexItem grow={7}>
          {isLoading && !configs ? (
            <EuiSkeletonText lines={10} />
          ) : (
            <>
              {isPrerelease && (
                <>
                  <EuiSpacer size="s" />
                  <PrereleaseCallout
                    packageName={packageInfo.name}
                    packageTitle={packageInfo.title}
                  />
                </>
              )}
              <EuiText>
                <p data-test-subj="configsTab.info">
                  <FormattedMessage
                    id="xpack.fleet.epm.InputTemplates.mainText"
                    defaultMessage="View sample configurations for each of the {name} integration's data streams below. Copy/paste this YML into your {elasticAgentYml} file or into a file within your {inputsDir} directory. For more information, see the {userGuideLink}"
                    values={{
                      name: pkgTitle,
                      elasticAgentYml: <EuiCode>elastic-agent.yml</EuiCode>,
                      inputsDir: <EuiCode>inputs.d</EuiCode>,
                      userGuideLink: (
                        <EuiLink
                          href={docLinks.links.fleet.elasticAgentInputConfiguration}
                          external
                          target="_blank"
                        >
                          <FormattedMessage
                            id="xpack.fleet.epm.InputTemplates.guideLink"
                            defaultMessage="Fleet and Elastic Agent Guide"
                          />
                        </EuiLink>
                      ),
                    }}
                  />
                </p>
              </EuiText>
              {notInstalled && (
                <>
                  <EuiSpacer size="s" />
                  <EuiCallOut
                    data-test-subj="configsTab.notInstalled"
                    title={
                      <FormattedMessage
                        id="xpack.fleet.epm.InputTemplates.installCallout"
                        defaultMessage="Install the integration to use the following configs."
                      />
                    }
                    color="warning"
                    iconType="warning"
                  />
                </>
              )}
              <EuiSpacer size="s" />
              <EuiCodeBlock
                language="yaml"
                isCopyable={true}
                paddingSize="s"
                overflowHeight={1000}
                data-test-subj="configsTab.codeblock"
              >
                {configs as React.ReactNode}
              </EuiCodeBlock>
            </>
          )}
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
