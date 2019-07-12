/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { KibanaLink } from '../../shared/Links/KibanaLink';
import { SetupInstructionsLink } from '../../shared/Links/SetupInstructionsLink';
import { LoadingStatePrompt } from '../../shared/LoadingStatePrompt';

interface Props {
  // any data submitted from APM agents found (not just in the given time range)
  historicalDataFound: boolean;
  isLoading: boolean;
}

export function NoServicesMessage({ historicalDataFound, isLoading }: Props) {
  if (isLoading) {
    return <LoadingStatePrompt />;
  }

  if (historicalDataFound) {
    return (
      <EuiEmptyPrompt
        title={
          <div>
            {i18n.translate('xpack.apm.servicesTable.notFoundLabel', {
              defaultMessage: 'No services found'
            })}
          </div>
        }
        titleSize="s"
      />
    );
  }

  return (
    <EuiEmptyPrompt
      title={
        <div>
          {i18n.translate('xpack.apm.servicesTable.noServicesLabel', {
            defaultMessage: `Looks like you don't have any APM services installed. Let's add some!`
          })}
        </div>
      }
      titleSize="s"
      body={
        <React.Fragment>
          <p>
            {i18n.translate('xpack.apm.servicesTable.7xUpgradeServerMessage', {
              defaultMessage: `Upgrading from a pre-7.x version? Make sure you've also upgraded
              your APM server instance(s) to at least 7.0.`
            })}
          </p>
          <p>
            {i18n.translate('xpack.apm.servicesTable.7xOldDataMessage', {
              defaultMessage:
                'You may also have old data that needs to be migrated.'
            })}{' '}
            <KibanaLink path="/management/elasticsearch/upgrade_assistant">
              {i18n.translate('xpack.apm.servicesTable.UpgradeAssistantLink', {
                defaultMessage:
                  'Learn more by visiting the Kibana Upgrade Assistant'
              })}
            </KibanaLink>
            .
          </p>
        </React.Fragment>
      }
      actions={<SetupInstructionsLink buttonFill={true} />}
    />
  );
}
