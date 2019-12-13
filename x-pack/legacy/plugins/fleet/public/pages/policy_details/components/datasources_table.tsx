/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiInMemoryTable, EuiEmptyPrompt, EuiButton } from '@elastic/eui';
import {
  DEFAULT_AGENTS_PAGE_SIZE,
  AGENTS_PAGE_SIZE_OPTIONS,
} from '../../../../common/constants/agent';
import { Datasource } from '../../../../common/types/domain_data';
import { useLibs } from '../../../hooks';

interface Props {
  datasources?: Datasource[];
}

export const DatasourcesTable: React.FC<Props> = ({ datasources }) => {
  const { framework } = useLibs();

  return (
    <EuiInMemoryTable
      message={
        !datasources || datasources.length === 0 ? (
          <EuiEmptyPrompt
            title={
              <h2>
                <FormattedMessage
                  id="xpack.fleet.policyDetails.noDatasourcesPrompt"
                  defaultMessage="Policy has no data sources"
                />
              </h2>
            }
            actions={
              <EuiButton
                fill
                iconType="plusInCircle"
                href={`${window.location.origin}${framework.info.basePath}/app/epm`}
              >
                <FormattedMessage
                  id="xpack.fleet.policyDetails.addDatasourceButtonText"
                  defaultMessage="Add a data source"
                />
              </EuiButton>
            }
          />
        ) : null
      }
      itemId="id"
      items={datasources}
      columns={[
        {
          field: 'name',
          name: i18n.translate('xpack.fleet.policyDetails.datasourcesTable.ameColumnTitle', {
            defaultMessage: 'Name/ID',
          }),
        },
        {
          field: 'package.title',
          name: i18n.translate(
            'xpack.fleet.policyDetails.datasourcesTable.packageNameColumnTitle',
            {
              defaultMessage: 'Package',
            }
          ),
        },
        {
          field: 'package.version',
          name: i18n.translate(
            'xpack.fleet.policyDetails.datasourcesTable.packageVersionColumnTitle',
            {
              defaultMessage: 'Version',
            }
          ),
        },
        {
          field: 'streams',
          name: i18n.translate(
            'xpack.fleet.policyDetails.datasourcesTable.streamsCountColumnTitle',
            {
              defaultMessage: 'Streams',
            }
          ),
          render: (streams: Datasource['streams']) => (streams ? streams.length : 0),
        },
      ]}
      sorting={{
        field: 'name',
        direction: 'asc',
      }}
      pagination={{
        initialPageSize: DEFAULT_AGENTS_PAGE_SIZE,
        pageSizeOptions: AGENTS_PAGE_SIZE_OPTIONS,
      }}
      search={{
        toolsRight: [
          <EuiButton
            fill
            iconType="plusInCircle"
            href={`${window.location.origin}${framework.info.basePath}/app/epm`}
          >
            <FormattedMessage
              id="xpack.fleet.policyDetails.addDatasourceButtonText"
              defaultMessage="Add a data source"
            />
          </EuiButton>,
        ],
        box: {
          incremental: true,
          schema: true,
        },
      }}
    />
  );
};
