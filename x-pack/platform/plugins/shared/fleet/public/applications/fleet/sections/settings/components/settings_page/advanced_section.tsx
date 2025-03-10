/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect } from 'react';

import {
  EuiTitle,
  EuiLink,
  EuiSpacer,
  EuiDescribedFormGroup,
  EuiSwitch,
  EuiForm,
  EuiFormRow,
  EuiToolTip,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { i18n } from '@kbn/i18n';

import {
  useAuthz,
  useGetSettings,
  usePutSettingsMutation,
  useStartServices,
} from '../../../../hooks';

export const AdvancedSection: React.FunctionComponent<{}> = ({}) => {
  const authz = useAuthz();
  const { docLinks, notifications } = useStartServices();
  const deleteUnenrolledAgents =
    useGetSettings().data?.item?.delete_unenrolled_agents?.enabled ?? false;
  const isPreconfigured =
    useGetSettings().data?.item?.delete_unenrolled_agents?.is_preconfigured ?? false;
  const [deleteUnenrolledAgentsChecked, setDeleteUnenrolledAgentsChecked] =
    React.useState<boolean>(deleteUnenrolledAgents);
  const { mutateAsync: mutateSettingsAsync } = usePutSettingsMutation();

  useEffect(() => {
    if (deleteUnenrolledAgents) {
      setDeleteUnenrolledAgentsChecked(deleteUnenrolledAgents);
    }
  }, [deleteUnenrolledAgents]);

  const updateSettings = useCallback(
    async (deleteFlag: boolean) => {
      try {
        setDeleteUnenrolledAgentsChecked(deleteFlag);
        const res = await mutateSettingsAsync({
          delete_unenrolled_agents: {
            enabled: deleteFlag,
            is_preconfigured: false,
          },
        });

        if (res.error) {
          throw res.error;
        }
      } catch (error) {
        setDeleteUnenrolledAgentsChecked(!deleteFlag);
        notifications.toasts.addError(error, {
          title: i18n.translate('xpack.fleet.errorUpdatingSettings', {
            defaultMessage: 'Error updating settings',
          }),
        });
      }
    },
    [mutateSettingsAsync, notifications.toasts]
  );

  return (
    <>
      <EuiTitle size="s">
        <h4 data-test-subj="advancedHeader">
          <FormattedMessage
            id="xpack.fleet.settings.advancedSectionTitle"
            defaultMessage="Advanced Settings"
          />
        </h4>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiForm component="form">
        <EuiDescribedFormGroup
          title={
            <h3>
              <FormattedMessage
                id="xpack.fleet.settings.deleteUnenrolledAgentsLabel"
                defaultMessage="Delete unenrolled agents"
              />
            </h3>
          }
          description={
            <p>
              <FormattedMessage
                id="xpack.fleet.settings.advancedSection.switchLabel"
                defaultMessage="Switching on this setting will enable auto deletion of unenrolled agents. For more information see our {docLink}."
                values={{
                  docLink: (
                    <EuiLink target="_blank" external href={docLinks.links.fleet.settings}>
                      <FormattedMessage
                        id="xpack.fleet.settings.advancedSection.link"
                        defaultMessage="docs"
                      />
                    </EuiLink>
                  ),
                }}
              />
            </p>
          }
        >
          <EuiFormRow label="">
            <EuiToolTip
              content={
                isPreconfigured
                  ? i18n.translate('xpack.fleet.settings.advancedSection.preconfiguredTitle', {
                      defaultMessage: 'This setting is preconfigured and cannot be updated.',
                    })
                  : undefined
              }
            >
              <EuiSwitch
                label={
                  <FormattedMessage
                    id="xpack.fleet.settings.deleteUnenrolledAgentsLabel"
                    defaultMessage="Delete unenrolled agents"
                  />
                }
                checked={deleteUnenrolledAgentsChecked}
                onChange={(e) => updateSettings(e.target.checked)}
                disabled={!authz.fleet.allSettings || isPreconfigured}
              />
            </EuiToolTip>
          </EuiFormRow>
        </EuiDescribedFormGroup>
      </EuiForm>

      <EuiSpacer size="m" />
    </>
  );
};
