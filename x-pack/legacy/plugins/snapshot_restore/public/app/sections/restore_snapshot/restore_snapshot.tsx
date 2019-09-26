/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect, useState } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { EuiPageBody, EuiPageContent, EuiSpacer, EuiTitle } from '@elastic/eui';

import { SnapshotDetails, RestoreSettings } from '../../../../common/types';
import { BASE_PATH } from '../../constants';
import { SectionError, SectionLoading, RestoreSnapshotForm, Error } from '../../components';
import { useAppDependencies } from '../../index';
import { breadcrumbService, docTitleService } from '../../services/navigation';
import { useLoadSnapshot, executeRestore } from '../../services/http';

interface MatchParams {
  repositoryName: string;
  snapshotId: string;
}

export const RestoreSnapshot: React.FunctionComponent<RouteComponentProps<MatchParams>> = ({
  match: {
    params: { repositoryName, snapshotId },
  },
  history,
}) => {
  const {
    core: { i18n },
  } = useAppDependencies();
  const { FormattedMessage } = i18n;

  // Set breadcrumb and page title
  useEffect(() => {
    breadcrumbService.setBreadcrumbs('restoreSnapshot');
    docTitleService.setTitle('restoreSnapshot');
  }, []);

  // Snapshot details state with default empty snapshot
  const [snapshotDetails, setSnapshotDetails] = useState<SnapshotDetails | {}>({});

  // Load snapshot
  const { error: snapshotError, isLoading: loadingSnapshot, data: snapshotData } = useLoadSnapshot(
    repositoryName,
    snapshotId
  );

  // Update repository state when data is loaded
  useEffect(() => {
    if (snapshotData) {
      setSnapshotDetails(snapshotData);
    }
  }, [snapshotData]);

  // Saving repository states
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<any>(null);

  // Execute restore
  const onSave = async (restoreSettings: RestoreSettings) => {
    setIsSaving(true);
    setSaveError(null);
    const { error } = await executeRestore(repositoryName, snapshotId, restoreSettings);
    if (error) {
      setIsSaving(false);
      setSaveError(error);
    } else {
      // Wait a few seconds before redirecting so that restore information has time to
      // populate into master node
      setTimeout(() => {
        setIsSaving(false);
        history.push(`${BASE_PATH}/restore_status`);
      }, 5 * 1000);
    }
  };

  const renderLoading = () => {
    return (
      <SectionLoading>
        <FormattedMessage
          id="xpack.snapshotRestore.restoreSnapshot.loadingSnapshotDescription"
          defaultMessage="Loading snapshot details…"
        />
      </SectionLoading>
    );
  };

  const renderError = () => {
    const notFound = (snapshotError as any).status === 404;
    const errorObject = notFound
      ? {
          data: {
            error: i18n.translate(
              'xpack.snapshotRestore.restoreSnapshot.snapshotNotFoundErrorMessage',
              {
                defaultMessage: `The snapshot '{snapshot}' does not exist in repository '{repository}'.`,
                values: {
                  snapshot: snapshotId,
                  repository: repositoryName,
                },
              }
            ),
          },
        }
      : snapshotError;
    return (
      <SectionError
        title={
          <FormattedMessage
            id="xpack.snapshotRestore.restoreSnapshot.loadingSnapshotErrorTitle"
            defaultMessage="Error loading snapshot details"
          />
        }
        error={errorObject as Error}
      />
    );
  };

  const renderSaveError = () => {
    return saveError ? (
      <SectionError
        title={
          <FormattedMessage
            id="xpack.snapshotRestore.restoreSnapshot.executeRestoreErrorTitle"
            defaultMessage="Unable to restore snapshot"
          />
        }
        error={saveError}
      />
    ) : null;
  };

  const clearSaveError = () => {
    setSaveError(null);
  };

  const renderContent = () => {
    if (loadingSnapshot) {
      return renderLoading();
    }
    if (snapshotError) {
      return renderError();
    }

    return (
      <RestoreSnapshotForm
        snapshotDetails={snapshotDetails as SnapshotDetails}
        isSaving={isSaving}
        saveError={renderSaveError()}
        clearSaveError={clearSaveError}
        onSave={onSave}
      />
    );
  };

  return (
    <EuiPageBody>
      <EuiPageContent>
        <EuiTitle size="m">
          <h1>
            <FormattedMessage
              id="xpack.snapshotRestore.restoreSnapshotTitle"
              defaultMessage="Restore '{snapshot}'"
              values={{ snapshot: snapshotId }}
            />
          </h1>
        </EuiTitle>
        <EuiSpacer size="l" />
        {renderContent()}
      </EuiPageContent>
    </EuiPageBody>
  );
};
