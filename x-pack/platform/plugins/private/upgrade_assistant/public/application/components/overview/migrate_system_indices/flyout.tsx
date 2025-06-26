/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, ReactNode } from 'react';
import { startCase } from 'lodash';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLoadingSpinner,
  EuiTitle,
  EuiText,
  EuiIcon,
  EuiSpacer,
  EuiInMemoryTable,
  EuiButtonIcon,
  EuiDescriptionList,
  EuiScreenReaderOnly,
  EuiBasicTableColumn,
  EuiCallOut,
} from '@elastic/eui';

import {
  SystemIndicesMigrationStatus,
  SystemIndicesMigrationFeature,
  MIGRATION_STATUS,
} from '../../../../../common/types';
import { MigrateSystemIndicesButton } from './migrate_button';

export interface SystemIndicesFlyoutProps {
  closeFlyout: () => void;
  data: SystemIndicesMigrationStatus;
  beginSystemIndicesMigration: () => void;
  isInitialRequest: boolean;
  isLoading: boolean;
  migrationStatus?: MIGRATION_STATUS;
}

const i18nTexts = {
  closeButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.overview.systemIndices.flyoutCloseButtonLabel',
    {
      defaultMessage: 'Close',
    }
  ),
  flyoutTitle: i18n.translate('xpack.upgradeAssistant.overview.systemIndices.flyoutTitle', {
    defaultMessage: 'Migrate system indices',
  }),
  flyoutDescription: i18n.translate(
    'xpack.upgradeAssistant.overview.systemIndices.flyoutDescription',
    {
      defaultMessage:
        'Migrate the indices that store information for the following features before you upgrade.',
    }
  ),
  migrationCompleteLabel: i18n.translate(
    'xpack.upgradeAssistant.overview.systemIndices.migrationCompleteLabel',
    {
      defaultMessage: 'Migration complete',
    }
  ),
  needsMigrationLabel: i18n.translate(
    'xpack.upgradeAssistant.overview.systemIndices.needsMigrationLabel',
    {
      defaultMessage: 'Migration required',
    }
  ),
  migratingLabel: i18n.translate('xpack.upgradeAssistant.overview.systemIndices.migratingLabel', {
    defaultMessage: 'Migration in progress',
  }),
  errorLabel: i18n.translate('xpack.upgradeAssistant.overview.systemIndices.errorLabel', {
    defaultMessage: 'Migration failed',
  }),
  featureNameTableColumn: i18n.translate(
    'xpack.upgradeAssistant.overview.systemIndices.featureNameTableColumn',
    {
      defaultMessage: 'Feature',
    }
  ),
  statusTableColumn: i18n.translate(
    'xpack.upgradeAssistant.overview.systemIndices.statusTableColumn',
    {
      defaultMessage: 'Status',
    }
  ),
  errorTooltipLabel: i18n.translate(
    'xpack.upgradeAssistant.overview.systemIndices.errorTooltipLabel',
    {
      defaultMessage: 'Migration failed for the following indices: ',
    }
  ),
  unknownErrorLabel: i18n.translate(
    'xpack.upgradeAssistant.overview.systemIndices.unknownErrorLabel',
    {
      defaultMessage: 'Unknown error',
    }
  ),
  migrationNotNeeded: i18n.translate(
    'xpack.upgradeAssistant.overview.systemIndices.migrationNotNeeded',
    {
      defaultMessage: 'Systems indices migration not needed',
    }
  ),
};

const getFailedIndices = (feature: SystemIndicesMigrationFeature) => {
  return feature.indices
    .filter((index) => index.failure_cause && index.failure_cause.error)
    .map((index) => ({
      index: index.index,
      reason: index?.failure_cause?.error.type,
    }));
};

const renderMigrationStatus = (status: MIGRATION_STATUS) => {
  if (status === 'NO_MIGRATION_NEEDED') {
    return (
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiIcon type="checkInCircleFilled" color="success" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText color="green" size="s" data-test-subj="featureNoUpgradeNeeded">
            <p>{i18nTexts.migrationCompleteLabel}</p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (status === 'MIGRATION_NEEDED') {
    return (
      <EuiText size="s" data-test-subj="featureUpgradeNeeded">
        <p>{i18nTexts.needsMigrationLabel}</p>
      </EuiText>
    );
  }

  if (status === 'IN_PROGRESS') {
    return (
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="m" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText color="subdued" size="s" data-test-subj="featureInProgress">
            <p>{i18nTexts.migratingLabel}</p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (status === 'ERROR') {
    return (
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiIcon type="warning" color="danger" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText color="danger" size="s" data-test-subj="featureError">
            <p>{i18nTexts.errorLabel}</p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return null;
};

export const SystemIndicesFlyout = ({
  closeFlyout,
  data,
  beginSystemIndicesMigration,
  isInitialRequest,
  isLoading,
  migrationStatus,
}: SystemIndicesFlyoutProps) => {
  const [expandedRows, setExpandedRows] = useState<Record<string, ReactNode>>({});

  const toggleRow = (feature: SystemIndicesMigrationFeature) => {
    setExpandedRows((prev) => {
      const newRows = { ...prev };
      if (newRows[feature.feature_name]) {
        delete newRows[feature.feature_name];
      } else {
        const failedIndices = getFailedIndices(feature);
        const errorDetails = failedIndices.map(({ index, reason }) => ({
          title: index,
          description: reason || i18nTexts.unknownErrorLabel,
        }));

        newRows[feature.feature_name] = <EuiDescriptionList listItems={errorDetails} />;
      }
      return newRows;
    });
  };

  const columns = [
    {
      field: 'feature_name',
      name: i18nTexts.featureNameTableColumn,
      sortable: true,
      truncateText: true,
      render: (name: string) => startCase(name),
    },
    {
      field: 'migration_status',
      name: i18nTexts.statusTableColumn,
      sortable: true,
      render: renderMigrationStatus,
    },
    {
      align: 'right',
      width: '40px',
      isExpander: true,
      name: (
        <EuiScreenReaderOnly>
          <span>
            <FormattedMessage
              id="xpack.upgradeAssistant.overview.systemIndices.expandRow"
              defaultMessage="Expand row"
            />
          </span>
        </EuiScreenReaderOnly>
      ),
      render: (feature: SystemIndicesMigrationFeature) => {
        return feature.migration_status === 'ERROR' ? (
          <EuiButtonIcon
            onClick={() => toggleRow(feature)}
            aria-label={expandedRows[feature.feature_name] ? 'Collapse' : 'Expand'}
            iconType={expandedRows[feature.feature_name] ? 'arrowDown' : 'arrowRight'}
          />
        ) : null;
      },
    },
  ] as Array<EuiBasicTableColumn<SystemIndicesMigrationFeature>>;

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s" data-test-subj="flyoutTitle">
          <h2 id="migrateSystemIndicesFlyoutTitle">{i18nTexts.flyoutTitle}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody data-test-subj="flyoutDetails">
        {migrationStatus === 'NO_MIGRATION_NEEDED' && (
          <EuiCallOut
            title={i18nTexts.migrationNotNeeded}
            iconType="cheer"
            color="success"
            data-test-subj="noMigrationNeededCallout"
          />
        )}

        {migrationStatus !== 'NO_MIGRATION_NEEDED' && (
          <>
            <EuiText>
              <p>{i18nTexts.flyoutDescription}</p>
            </EuiText>
            <EuiSpacer size="l" />
            <EuiInMemoryTable<SystemIndicesMigrationFeature>
              data-test-subj="featuresTable"
              itemId="feature_name"
              items={data.features}
              columns={columns}
              itemIdToExpandedRowMap={expandedRows}
              pagination={true}
              sorting={true}
            />
          </>
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={closeFlyout} flush="left">
              {i18nTexts.closeButtonLabel}
            </EuiButtonEmpty>
          </EuiFlexItem>

          {migrationStatus !== 'NO_MIGRATION_NEEDED' && (
            <EuiFlexItem grow={false}>
              <MigrateSystemIndicesButton
                buttonProps={{ fill: true }}
                beginSystemIndicesMigration={beginSystemIndicesMigration}
                isInitialRequest={isInitialRequest}
                isLoading={isLoading}
                isMigrating={migrationStatus === 'IN_PROGRESS'}
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
