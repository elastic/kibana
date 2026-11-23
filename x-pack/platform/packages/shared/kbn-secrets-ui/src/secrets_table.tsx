/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBadge,
  EuiButton,
  EuiButtonIcon,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedRelative } from '@kbn/i18n-react';
import { SECRET_PROVIDER_TYPE } from '@kbn/secrets';
import type { SecretConnector, SecretMetadata } from '@kbn/secrets';

interface SecretsTableProps {
  secrets: SecretMetadata[];
  /** Lets the source of a connector secret show the name of its connector. */
  connectors: readonly SecretConnector[];
  /** How the consumer refers to a secret by its name, for the copy button. */
  getSecretReference: (name: string) => string;
  /** The secret that is being tested, so that it cannot be tested twice at once. */
  testingSecretName?: string;
  onTest: (secret: SecretMetadata) => void;
  onReplace: (secret: SecretMetadata) => void;
  onDelete: (secret: SecretMetadata) => void;
  onCreate: () => void;
}

export const SecretsTable = ({
  secrets,
  connectors,
  getSecretReference,
  testingSecretName,
  onTest,
  onReplace,
  onDelete,
  onCreate,
}: SecretsTableProps) => {
  const connectorsById = useMemo(
    () => new Map(connectors.map((connector) => [connector.id, connector])),
    [connectors]
  );

  const columns: Array<EuiBasicTableColumn<SecretMetadata>> = [
    {
      field: 'name',
      name: i18n.translate('xpack.secretsUi.table.nameColumn', { defaultMessage: 'Name' }),
      sortable: true,
      render: (name: string) => (
        <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText size="s">{name}</EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiCopy textToCopy={getSecretReference(name)}>
              {(copy) => {
                const copyLabel = i18n.translate('xpack.secretsUi.table.copyReferenceLabel', {
                  defaultMessage: 'Copy the reference to {name}',
                  values: { name },
                });
                return (
                  <EuiToolTip content={copyLabel} disableScreenReaderOutput>
                    <EuiButtonIcon
                      iconType="copy"
                      size="xs"
                      onClick={copy}
                      aria-label={copyLabel}
                      data-test-subj="secretCopyReference"
                    />
                  </EuiToolTip>
                );
              }}
            </EuiCopy>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    },
    {
      field: 'description',
      name: i18n.translate('xpack.secretsUi.table.descriptionColumn', {
        defaultMessage: 'Description',
      }),
      truncateText: true,
    },
    {
      name: i18n.translate('xpack.secretsUi.table.sourceColumn', { defaultMessage: 'Source' }),
      render: (secret: SecretMetadata) => {
        if (secret.provider === SECRET_PROVIDER_TYPE.kibana) {
          return (
            <EuiBadge color="hollow" iconType="lock">
              {i18n.translate('xpack.secretsUi.table.kibanaSource', {
                defaultMessage: 'Kibana',
              })}
            </EuiBadge>
          );
        }
        const connector = connectorsById.get(secret.connectorId);
        return <EuiText size="s">{connector?.name ?? secret.connectorId}</EuiText>;
      },
    },
    {
      name: i18n.translate('xpack.secretsUi.table.referenceColumn', {
        defaultMessage: 'Reference',
      }),
      truncateText: true,
      // A value stored in Kibana has no reference: it is not somewhere else.
      render: (secret: SecretMetadata) =>
        secret.provider === SECRET_PROVIDER_TYPE.connector ? (
          <EuiText size="s" title={secret.reference}>
            {secret.reference}
          </EuiText>
        ) : null,
    },
    {
      field: 'updatedBy',
      name: i18n.translate('xpack.secretsUi.table.updatedByColumn', {
        defaultMessage: 'Updated by',
      }),
    },
    {
      field: 'updatedAt',
      name: i18n.translate('xpack.secretsUi.table.updatedAtColumn', {
        defaultMessage: 'Updated',
      }),
      sortable: true,
      render: (updatedAt: string) => (
        <EuiToolTip content={new Date(updatedAt).toLocaleString()}>
          <EuiText size="s" tabIndex={0}>
            <FormattedRelative value={updatedAt} />
          </EuiText>
        </EuiToolTip>
      ),
    },
    {
      name: i18n.translate('xpack.secretsUi.table.actionsColumn', { defaultMessage: 'Actions' }),
      actions: [
        {
          name: i18n.translate('xpack.secretsUi.table.testAction', { defaultMessage: 'Test' }),
          description: i18n.translate('xpack.secretsUi.table.testActionDescription', {
            defaultMessage: 'Check that the value can be read',
          }),
          icon: 'play',
          type: 'icon',
          // Without `isPrimary` on every action, three of them collapse into a "…" menu.
          isPrimary: true,
          // Only a value that lives in a secret manager can be unreachable.
          available: ({ provider }) => provider === SECRET_PROVIDER_TYPE.connector,
          enabled: ({ name }) => name !== testingSecretName,
          onClick: onTest,
          'data-test-subj': 'secretTestAction',
        },
        {
          name: i18n.translate('xpack.secretsUi.table.replaceAction', {
            defaultMessage: 'Replace',
          }),
          description: i18n.translate('xpack.secretsUi.table.replaceActionDescription', {
            defaultMessage: 'Replace the value or the description',
          }),
          icon: 'pencil',
          type: 'icon',
          isPrimary: true,
          onClick: onReplace,
          'data-test-subj': 'secretReplaceAction',
        },
        {
          name: i18n.translate('xpack.secretsUi.table.deleteAction', {
            defaultMessage: 'Delete',
          }),
          description: i18n.translate('xpack.secretsUi.table.deleteActionDescription', {
            defaultMessage: 'Delete the secret',
          }),
          icon: 'trash',
          color: 'danger',
          type: 'icon',
          isPrimary: true,
          onClick: onDelete,
          'data-test-subj': 'secretDeleteAction',
        },
      ],
    },
  ];

  return (
    <EuiInMemoryTable<SecretMetadata>
      items={secrets}
      columns={columns}
      search={{
        box: {
          incremental: true,
          placeholder: i18n.translate('xpack.secretsUi.table.searchPlaceholder', {
            defaultMessage: 'Search secrets',
          }),
          'data-test-subj': 'secretsSearch',
        },
        toolsRight: (
          <EuiButton iconType="plusCircle" onClick={onCreate} data-test-subj="secretCreateButton">
            {i18n.translate('xpack.secretsUi.table.createButton', {
              defaultMessage: 'Create secret',
            })}
          </EuiButton>
        ),
      }}
      sorting={{ sort: { field: 'name', direction: 'asc' } }}
      pagination={{ initialPageSize: 20, pageSizeOptions: [20, 50, 100] }}
      tableCaption={i18n.translate('xpack.secretsUi.table.caption', {
        defaultMessage: 'Secrets',
      })}
      data-test-subj="secretsTable"
    />
  );
};
