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
import type { Output } from '../../../../types';

import { OutputHealth } from '../edit_output_flyout/output_health';

import { DefaultBadges } from './badges';

export interface OutputsTableProps {
  outputs: Output[];
  deleteOutput: (output: Output) => void;
}

const NameFlexItemWithMaxWidth = styled(EuiFlexItem)`
  max-width: 250px;
`;

// Allow child to be truncated
const FlexGroupWithMinWidth = styled(EuiFlexGroup)`
  min-width: 0px;
`;

function displayOutputType(type: string) {
  switch (type) {
    case 'elasticsearch':
      return i18n.translate('xpack.fleet.settings.outputsTable.elasticsearchTypeLabel', {
        defaultMessage: 'Elasticsearch',
      });
    case 'remote_elasticsearch':
      return i18n.translate('xpack.fleet.settings.outputsTable.remoteElasticsearchTypeLabel', {
        defaultMessage: 'Remote Elasticsearch',
      });
    default:
      return type;
  }
}

export const OutputsTable: React.FunctionComponent<OutputsTableProps> = ({
  outputs,
  deleteOutput,
}) => {
  const authz = useAuthz();
  const { getHref } = useLink();

  const columns = useMemo((): Array<EuiBasicTableColumn<Output>> => {
    return [
      {
        render: (output: Output) => (
          <EuiFlexGroup alignItems="center" gutterSize="xs">
            <NameFlexItemWithMaxWidth grow={false}>
              <p title={output.name} className={`eui-textTruncate`}>
                {output.name}
              </p>
            </NameFlexItemWithMaxWidth>
            {output.is_preconfigured && (
              <EuiFlexItem grow={false}>
                <EuiIconTip
                  content={i18n.translate('xpack.fleet.settings.outputsTable.managedTooltip', {
                    defaultMessage: 'This output is managed outside of Fleet.',
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
        name: i18n.translate('xpack.fleet.settings.outputsTable.nameColumnTitle', {
          defaultMessage: 'Name',
        }),
      },
      {
        width: '172px',
        render: (output: Output) => displayOutputType(output.type),
        name: i18n.translate('xpack.fleet.settings.outputsTable.typeColumnTitle', {
          defaultMessage: 'Type',
        }),
      },
      {
        truncateText: true,
        render: (output: Output) => (
          <FlexGroupWithMinWidth direction="column" gutterSize="xs">
            {(output.hosts || []).map((host) => (
              <EuiFlexItem key={host}>
                <p title={host} className={`eui-textTruncate`}>
                  {host}
                </p>
              </EuiFlexItem>
            ))}
          </FlexGroupWithMinWidth>
        ),
        name: i18n.translate('xpack.fleet.settings.outputsTable.hostColumnTitle', {
          defaultMessage: 'Hosts',
        }),
      },
      {
        render: (output: Output) => {
          return output?.id && output.type === 'remote_elasticsearch' ? (
            <OutputHealth output={output} showBadge={true} />
          ) : null;
        },
        name: i18n.translate('xpack.fleet.settings.outputsTable.statusColumnTitle', {
          defaultMessage: 'Status',
        }),
      },
      {
        render: (output: Output) => <DefaultBadges output={output} />,
        width: '200px',
        name: i18n.translate('xpack.fleet.settings.outputSection.defaultColumnTitle', {
          defaultMessage: 'Default',
        }),
      },
      {
        width: '68px',
        render: (output: Output) => {
          const isDeleteVisible =
            !output.is_default &&
            !output.is_default_monitoring &&
            !output.is_preconfigured &&
            authz.fleet.allSettings;

          return (
            <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                {isDeleteVisible && (
                  <EuiButtonIcon
                    color="text"
                    iconType="trash"
                    onClick={() => deleteOutput(output)}
                    title={i18n.translate('xpack.fleet.settings.outputSection.deleteButtonTitle', {
                      defaultMessage: 'Delete',
                    })}
                  />
                )}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  color="text"
                  iconType="pencil"
                  href={getHref('settings_edit_outputs', { outputId: output.id })}
                  title={i18n.translate('xpack.fleet.settings.outputSection.editButtonTitle', {
                    defaultMessage: 'Edit',
                  })}
                  data-test-subj="editOutputBtn"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        },
        name: i18n.translate('xpack.fleet.settings.outputSection.actionsColumnTitle', {
          defaultMessage: 'Actions',
        }),
      },
    ];
  }, [deleteOutput, getHref, authz.fleet.allSettings]);

  return <EuiBasicTable columns={columns} items={outputs} data-test-subj="settingsOutputsTable" />;
};
