/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiDescribedFormGroup, EuiFieldText, EuiFormRow, EuiLink } from '@elastic/eui';
import { ApplicationStart } from '@kbn/core-application-browser';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo } from 'react';

export const LogSourcesSettingSynchronisationInfo: React.FC<{
  isLoading: boolean;
  logSourcesValue: string;
  getUrlForApp: ApplicationStart['getUrlForApp'];
  title?: string;
}> = ({ isLoading, logSourcesValue, getUrlForApp, title }) => {
  const advancedSettingsHref = useMemo(
    () =>
      getUrlForApp('management', {
        path: `/kibana/settings?query=${encodeURIComponent('Log sources')}`,
      }),
    [getUrlForApp]
  );

  return (
    <>
      <EuiDescribedFormGroup
        fullWidth
        title={
          <h4>
            {title ?? (
              <FormattedMessage
                id="xpack.logsDataAccess.logSourcesSettingInfo.logSourcesSettingTitle"
                defaultMessage="Log sources"
              />
            )}
          </h4>
        }
        description={
          <FormattedMessage
            id="xpack.logsDataAccess.logSourcesSettingInfo.logSourcesSettingDescription"
            defaultMessage="This value is synchronised with the Kibana log sources advanced setting. It can be changed via the {advancedSettingsLink}."
            values={{
              advancedSettingsLink: (
                <EuiLink
                  data-test-subj="xpack.infra.logSourcesSettingInfo.logSourcesSettingLink"
                  href={advancedSettingsHref}
                >
                  <FormattedMessage
                    id="xpack.logsDataAccess.logSourcesSettingInfo.logSourcesSettingLinkText"
                    defaultMessage="advanced settings page"
                  />
                </EuiLink>
              ),
            }}
          />
        }
      >
        <EuiFormRow
          fullWidth
          label={
            <FormattedMessage
              id="xpack.logsDataAccess.logSourcesSettingInfo.logSourcesSettingLabel"
              defaultMessage="Log sources advanced setting"
            />
          }
        >
          <EuiFieldText
            data-test-subj="logSourcesSettingInput"
            fullWidth
            disabled={true}
            isLoading={isLoading}
            value={logSourcesValue}
            isInvalid={false}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
    </>
  );
};
