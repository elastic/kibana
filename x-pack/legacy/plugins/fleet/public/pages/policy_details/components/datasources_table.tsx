/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiInMemoryTable, EuiInMemoryTableProps, EuiLink } from '@elastic/eui';
import { Datasource } from '../../../../common/types/domain_data';
import { useLibs } from '../../../hooks';

interface Props extends EuiInMemoryTableProps {
  datasources?: Datasource[];
}

export const DatasourcesTable: React.FC<Props> = ({
  datasources: originalDatasources,
  ...rest
}) => {
  const { framework } = useLibs();

  // Flatten some values so that they can be searched via in-memory table search
  const datasources = originalDatasources?.map(
    ({
      id,
      name,
      streams,
      package: {
        name: packageName,
        title: packageTitle,
        version: packageVersion,
        description: packageDescription,
      },
    }) => ({
      id,
      name,
      streams: streams.length || 0,
      packageName,
      packageTitle,
      packageVersion,
      packageDescription,
    })
  );

  return (
    <EuiInMemoryTable
      itemId="id"
      items={datasources}
      columns={[
        {
          field: 'name',
          name: i18n.translate('xpack.fleet.policyDetails.datasourcesTable.ameColumnTitle', {
            defaultMessage: 'Name',
          }),
        },
        {
          field: 'packageTitle',
          name: i18n.translate(
            'xpack.fleet.policyDetails.datasourcesTable.packageNameColumnTitle',
            {
              defaultMessage: 'Package',
            }
          ),
        },
        {
          field: 'packageVersion',
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
        },
        {
          name: i18n.translate('xpack.fleet.policyDetails.datasourcesTable.actionsColumnTitle', {
            defaultMessage: 'Actions',
          }),
          actions: [
            {
              render: ({ packageName, packageVersion }: any) => {
                return (
                  <EuiLink
                    color="primary"
                    external
                    target="_blank"
                    href={`${window.location.origin}${framework.info.basePath}/app/epm#/detail/${packageName}-${packageVersion}`}
                  >
                    <FormattedMessage
                      id="xpack.fleet.policyDetails.datasourcesTable.viewActionLinkText"
                      defaultMessage="view"
                    />
                  </EuiLink>
                );
              },
            },
          ],
          width: '100px',
        },
      ]}
      sorting={{
        field: 'name',
        direction: 'asc',
      }}
      {...rest}
    />
  );
};
