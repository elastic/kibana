/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, FC, PropsWithChildren } from 'react';

import { useActions, useValues } from 'kea';

import { EuiFlexItem, EuiSpacer, EuiSplitPanel, EuiText, EuiTitle } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';

import {
  ConnectorStatus,
  SchedulingConfiguraton,
  ConnectorSchedulingComponent,
} from '@kbn/search-connectors';

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useHistory } from 'react-router-dom';
import { ScopedHistory } from '@kbn/core/public';
import { UpdateConnectorSchedulingApiLogic } from '../../../api/connector/update_connector_scheduling_api_logic';
import { CONNECTOR_DETAIL_TAB_PATH } from '../../routes';
import { ConnectorDetailTabId } from '../../connector_detail/connector_detail';
import { ConnectorViewLogic } from '../../connector_detail/connector_view_logic';
import { Status } from '../../../../common/types/api';
import { generateEncodedPath } from '../../shared/encode_path_params';
import { useAppContext } from '../../../app_context';
import { UnsavedChangesPrompt } from '../../shared/unsaved_changes_prompt';
import { generateReactRouterProps } from '../../shared/react_router_helpers';

interface SchedulePanelProps {
  description: string;
  title: string;
}
export const SchedulePanel: FC<PropsWithChildren<SchedulePanelProps>> = ({
  title,
  description,
  children,
}) => {
  return (
    <>
      <EuiSplitPanel.Outer>
        <EuiSplitPanel.Inner color="subdued">
          <EuiTitle>
            <h2>{title}</h2>
          </EuiTitle>
        </EuiSplitPanel.Inner>
        <EuiSplitPanel.Inner>
          <EuiFlexItem>
            <EuiText size="s">{description}</EuiText>
          </EuiFlexItem>
          <EuiSpacer size="m" />
          {children}
        </EuiSplitPanel.Inner>
      </EuiSplitPanel.Outer>
    </>
  );
};

export const ConnectorScheduling: React.FC = () => {
  const {
    services: { application, http },
  } = useKibana();
  const history = useHistory();
  const { connector, hasDocumentLevelSecurityFeature, hasIncrementalSyncFeature } = useValues(
    ConnectorViewLogic({ http })
  );
  const { status } = useValues(UpdateConnectorSchedulingApiLogic);
  const { makeRequest } = useActions(UpdateConnectorSchedulingApiLogic);
  const [hasChanges, setHasChanges] = useState<boolean>(false);

  const { hasPlatinumLicense } = useAppContext();
  const shouldShowIncrementalSync = hasIncrementalSyncFeature;

  const shouldShowAccessControlSync = hasDocumentLevelSecurityFeature;

  if (!connector) {
    return <></>;
  }

  return (
    <>
      <UnsavedChangesPrompt
        hasUnsavedChanges={hasChanges}
        messageText={i18n.translate(
          'xpack.contentConnectors.content.indices.connectorScheduling.unsaved.title',
          { defaultMessage: 'You have not saved your changes, are you sure you want to leave?' }
        )}
      />

      <ConnectorSchedulingComponent
        children={
          <>
            <EuiText size="s">
              <p>
                <FormattedMessage
                  id="xpack.contentConnectors.content.indices.connectorScheduling.page.description"
                  defaultMessage="Your connector is now deployed. Schedule recurring content and access control syncs here. If you want to run a quick test, launch a one-time sync using the {sync} button."
                  values={{
                    sync: (
                      <b>
                        {i18n.translate(
                          'xpack.contentConnectors.content.indices.connectorScheduling.page.sync.label',
                          {
                            defaultMessage: 'Sync',
                          }
                        )}
                      </b>
                    ),
                  }}
                />
              </p>
            </EuiText>
            <EuiSpacer size="l" />
          </>
        }
        connector={connector}
        configurationPathOnClick={() =>
          application?.navigateToUrl(
            generateReactRouterProps({
              to: generateEncodedPath(CONNECTOR_DETAIL_TAB_PATH, {
                connectorId: connector.id,
                tabId: ConnectorDetailTabId.CONFIGURATION,
              }),
              http,
              navigateToUrl: application?.navigateToUrl as any,
              history: history as ScopedHistory,
            }).href
          )
        }
        dataTelemetryIdPrefix="entSearchContent"
        hasChanges={hasChanges}
        hasIngestionError={connector.status === ConnectorStatus.ERROR}
        hasPlatinumLicense={hasPlatinumLicense}
        setHasChanges={setHasChanges}
        shouldShowAccessControlSync={shouldShowAccessControlSync}
        shouldShowIncrementalSync={shouldShowIncrementalSync}
        updateConnectorStatus={status === Status.LOADING}
        updateScheduling={(scheduling: SchedulingConfiguraton) =>
          makeRequest({ connectorId: connector.id, scheduling, http })
        }
      />
    </>
  );
};

export interface Schedule {
  days: string;
  hours: string;
  minutes: string;
}
