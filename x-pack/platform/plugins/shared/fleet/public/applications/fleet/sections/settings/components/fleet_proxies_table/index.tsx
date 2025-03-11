/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import styled from 'styled-components';
import { EuiBasicTable, EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiIconTip } from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { useAuthz, useLink } from '../../../../hooks';
import type { FleetProxy } from '../../../../types';

export interface FleetProxiesTableProps {
  proxies: FleetProxy[];
  deleteFleetProxy: (ds: FleetProxy) => void;
}

const NameFlexItemWithMaxWidth = styled(EuiFlexItem)`
  max-width: 250px;
`;

export const FleetProxiesTable: React.FunctionComponent<FleetProxiesTableProps> = ({
  proxies,
  deleteFleetProxy,
}) => {
  const authz = useAuthz();
  const { getHref } = useLink();

  const columns = useMemo((): Array<EuiBasicTableColumn<FleetProxy>> => {
    return [
      {
        render: (fleetProxy: FleetProxy) => (
          <EuiFlexGroup alignItems="center" gutterSize="xs">
            <NameFlexItemWithMaxWidth grow={false}>
              <p
                title={fleetProxy.name}
                className={`eui-textTruncate`}
                data-test-subj="fleetProxiesTable.name"
              >
                {fleetProxy.name}
              </p>
            </NameFlexItemWithMaxWidth>
            {fleetProxy.is_preconfigured && (
              <EuiFlexItem grow={false}>
                <EuiIconTip
                  content={i18n.translate('xpack.fleet.settings.fleetProxiesTable.managedTooltip', {
                    defaultMessage:
                      'This proxy is managed outside of Fleet. Please refer to your kibana config file for more info.',
                  })}
                  type="lock"
                  size="m"
                  color="subdued"
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        ),
        width: '288px',
        name: i18n.translate('xpack.fleet.settings.fleetProxiesTable.nameColumnTitle', {
          defaultMessage: 'Name',
        }),
      },
      {
        truncateText: true,
        field: 'url',
        name: i18n.translate('xpack.fleet.settings.fleetProxiesTable.urlColumnTitle', {
          defaultMessage: 'Url',
        }),
      },
      {
        width: '68px',
        render: (fleetProxy: FleetProxy) => {
          const isDeleteVisible = authz.fleet.allSettings && !fleetProxy.is_preconfigured;

          return (
            <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                {isDeleteVisible && (
                  <EuiButtonIcon
                    color="text"
                    iconType="trash"
                    onClick={() => deleteFleetProxy(fleetProxy)}
                    title={i18n.translate(
                      'xpack.fleet.settings.fleetProxiesTable.deleteButtonTitle',
                      {
                        defaultMessage: 'Delete',
                      }
                    )}
                    data-test-subj="fleetProxiesTable.delete.btn"
                  />
                )}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  color="text"
                  iconType="pencil"
                  href={getHref('settings_edit_fleet_proxy', {
                    itemId: fleetProxy.id,
                  })}
                  title={i18n.translate('xpack.fleet.settings.fleetProxiesTable.editButtonTitle', {
                    defaultMessage: 'Edit',
                  })}
                  data-test-subj="fleetProxiesTable.edit.btn"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        },
        name: i18n.translate('xpack.fleet.settings.fleetProxiesTable.actionsColumnTitle', {
          defaultMessage: 'Actions',
        }),
      },
    ];
  }, [deleteFleetProxy, getHref, authz.fleet.allSettings]);

  return <EuiBasicTable columns={columns} items={proxies} data-test-subj="fleetProxiesTable" />;
};
