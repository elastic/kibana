/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useEffect } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiText,
  EuiButton,
  EuiSpacer,
  EuiIcon,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiCode,
  EuiLink,
} from '@elastic/eui';
import type { EuiStepProps } from '@elastic/eui/src/components/steps/step';

import { DocLinksStart } from '@kbn/core/public';
import type { SystemIndicesMigrationFeature } from '../../../../../common/types';
import type { OverviewStepProps } from '../../types';
import { useMigrateSystemIndices } from './use_migrate_system_indices';
import { MigrateSystemIndicesButton } from './migrate_button';

interface Props {
  setIsComplete: OverviewStepProps['setIsComplete'];
}

const getFailureCauses = (features: SystemIndicesMigrationFeature[]) => {
  const errorsByFeature: Record<string, { errors: Set<string>; indices: number }> = {};

  features.forEach((feature) => {
    if (feature.migration_status === 'ERROR') {
      feature.indices.forEach((index) => {
        if (index.failure_cause) {
          if (!errorsByFeature[feature.feature_name]) {
            errorsByFeature[feature.feature_name] = { errors: new Set(), indices: 0 };
          }
          errorsByFeature[feature.feature_name].errors.add(index.failure_cause.error.type);
          errorsByFeature[feature.feature_name].indices += 1;
        }
      });
    }
  });

  return (
    <ul>
      {Object.entries(errorsByFeature).map(([feature, { errors, indices }]) => {
        const indicesAffectedText = i18n.translate(
          'xpack.upgradeAssistant.systemIndices.migrationFailed.indicesAffected',
          {
            defaultMessage: '{count, plural, =1 {# index affected} other {# indices affected}}',
            values: { count: indices },
          }
        );

        return (
          <li key={feature}>
            <strong>{feature}</strong>:{' '}
            {Array.from(errors).map((error, index) => (
              <React.Fragment key={error}>
                <EuiCode>{error}</EuiCode>
                {index < errors.size - 1 && ', '}
              </React.Fragment>
            ))}{' '}
            ({indicesAffectedText})
          </li>
        );
      })}
    </ul>
  );
};

const i18nTexts = {
  title: i18n.translate('xpack.upgradeAssistant.overview.systemIndices.title', {
    defaultMessage: 'Migrate system indices',
  }),
  bodyDescription: (docLink: string) => {
    return (
      <FormattedMessage
        id="xpack.upgradeAssistant.overview.systemIndices.body"
        defaultMessage="Prepare the system indices that store internal information for the upgrade. This is only required during major version upgrades. Any {hiddenIndicesLink} that need to be reindexed are shown in the next step."
        values={{
          hiddenIndicesLink: (
            <EuiLink external target="_blank" href={docLink}>
              <FormattedMessage
                id="xpack.upgradeAssistant.overview.systemIndices.body.hiddenIndicesLink"
                defaultMessage="hidden indices"
              />
            </EuiLink>
          ),
        }}
      />
    );
  },
  noMigrationNeeded: i18n.translate(
    'xpack.upgradeAssistant.overview.systemIndices.noMigrationNeeded',
    {
      defaultMessage: 'System indices migration not needed.',
    }
  ),
  viewSystemIndicesStatus: i18n.translate(
    'xpack.upgradeAssistant.overview.systemIndices.viewSystemIndicesStatus',
    {
      defaultMessage: 'View migration details',
    }
  ),
  retryButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.overview.systemIndices.retryButtonLabel',
    {
      defaultMessage: 'Retry migration',
    }
  ),
  loadingError: i18n.translate('xpack.upgradeAssistant.overview.systemIndices.loadingError', {
    defaultMessage: 'Could not retrieve the system indices status',
  }),
  migrationFailedTitle: i18n.translate(
    'xpack.upgradeAssistant.overview.systemIndices.migrationFailedTitle',
    {
      defaultMessage: 'System indices migration failed',
    }
  ),
  migrationFailedBody: (features: SystemIndicesMigrationFeature[]) => {
    const failureCauses = getFailureCauses(features);
    return (
      <EuiText size="s">
        <FormattedMessage
          id="xpack.upgradeAssistant.overview.systemIndices.migrationFailedBodyFirstParagraph"
          defaultMessage="Errors occurred while migrating system indices:"
        />
        <EuiSpacer size="s" />
        {failureCauses}
        <FormattedMessage
          id="xpack.upgradeAssistant.overview.systemIndices.migrationFailedBodySecondParagraph"
          defaultMessage="Check migration details for more information."
          tagName="p"
        />
      </EuiText>
    );
  },
};

const MigrateSystemIndicesStep: FunctionComponent<Props> = ({ setIsComplete }) => {
  const { beginSystemIndicesMigration, startMigrationStatus, migrationStatus, setShowFlyout } =
    useMigrateSystemIndices();

  useEffect(() => {
    setIsComplete(migrationStatus.data?.migration_status === 'NO_MIGRATION_NEEDED');
    // Depending upon setIsComplete would create an infinite loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [migrationStatus.data?.migration_status]);

  if (migrationStatus.error) {
    return (
      <EuiCallOut
        title={i18nTexts.loadingError}
        color="danger"
        iconType="warning"
        data-test-subj="systemIndicesStatusErrorCallout"
      >
        <p>
          {migrationStatus.error.statusCode} - {migrationStatus.error.message as string}
        </p>
        <EuiButton
          color="danger"
          isLoading={migrationStatus.isLoading}
          onClick={migrationStatus.resendRequest}
          data-test-subj="systemIndicesStatusRetryButton"
        >
          {i18nTexts.retryButtonLabel}
        </EuiButton>
      </EuiCallOut>
    );
  }

  if (migrationStatus.data?.migration_status === 'NO_MIGRATION_NEEDED') {
    return (
      <EuiFlexGroup alignItems="center" gutterSize="s" data-test-subj="noMigrationNeededSection">
        <EuiFlexItem grow={false}>
          <EuiIcon type="check" color="success" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText color="success">
            <p>{i18nTexts.noMigrationNeeded}</p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  const isButtonDisabled = migrationStatus.isInitialRequest && migrationStatus.isLoading;
  const isMigrating = migrationStatus.data?.migration_status === 'IN_PROGRESS';

  return (
    <>
      {startMigrationStatus.statusType === 'error' && (
        <>
          <EuiCallOut
            size="s"
            color="danger"
            iconType="warning"
            title={`${startMigrationStatus.error!.statusCode} - ${
              startMigrationStatus.error!.message
            }`}
            data-test-subj="startSystemIndicesMigrationCalloutError"
          />
          <EuiSpacer size="m" />
        </>
      )}

      {migrationStatus.data?.migration_status === 'ERROR' && (
        <>
          <EuiCallOut
            size="s"
            color="danger"
            iconType="warning"
            title={i18nTexts.migrationFailedTitle}
            data-test-subj="migrationFailedCallout"
          >
            {i18nTexts.migrationFailedBody(migrationStatus.data?.features)}
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      )}

      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <MigrateSystemIndicesButton
            beginSystemIndicesMigration={beginSystemIndicesMigration}
            isInitialRequest={migrationStatus.isInitialRequest}
            isLoading={migrationStatus.isLoading}
            isMigrating={isMigrating}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            onClick={() => setShowFlyout(true)}
            isDisabled={isButtonDisabled}
            data-test-subj="viewSystemIndicesStateButton"
          >
            {i18nTexts.viewSystemIndicesStatus}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

interface CustomProps {
  docLinks: DocLinksStart;
}

export const getMigrateSystemIndicesStep = ({
  isComplete,

  setIsComplete,
  docLinks,
}: OverviewStepProps & CustomProps): EuiStepProps => {
  const status = isComplete ? 'complete' : 'incomplete';

  return {
    title: i18nTexts.title,
    status,
    'data-test-subj': `migrateSystemIndicesStep-${status}`,
    children: (
      <>
        <EuiText data-test-subj="migrateSystemIndicesText">
          <p>{i18nTexts.bodyDescription(docLinks.links.elasticsearch.hiddenIndices)}</p>
        </EuiText>

        <EuiSpacer size="m" />

        <MigrateSystemIndicesStep setIsComplete={setIsComplete} />
      </>
    ),
  };
};
