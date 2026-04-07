/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { RouteComponentProps } from 'react-router-dom';

import { EuiCallOut, EuiConfirmModal, EuiPageSection, EuiPageHeader, EuiSpacer, useGeneratedHtmlId } from '@elastic/eui';
import type { Repository, EmptyRepository } from '../../../../common/types';

import type { Error } from '../../../shared_imports';
import { PageError, SectionError } from '../../../shared_imports';
import { RepositoryForm, PageLoading } from '../../components';
import type { Section } from '../../constants';
import { BASE_PATH } from '../../constants';
import { useServices, useToastNotifications } from '../../app_context';
import { breadcrumbService, docTitleService } from '../../services/navigation';
import { editRepository, useLoadRepositories, useLoadRepository } from '../../services/http';
import { useDefaultRepository } from '../../services/use_default_repository';
import { useDecodedParams } from '../../lib';

interface MatchParams {
  name: string;
}

export const RepositoryEdit: React.FunctionComponent<RouteComponentProps<MatchParams>> = ({
  history,
}) => {
  const { i18n } = useServices();
  const { name } = useDecodedParams<MatchParams>();
  const section = 'repositories' as Section;
  const { defaultRepository, setDefaultRepository } = useDefaultRepository();
  const toastNotifications = useToastNotifications();
  const { data: repositoriesData } = useLoadRepositories();
  const isOnlyRepository = (repositoriesData?.repositories?.length ?? 0) <= 1;

  // Set breadcrumb and page title
  useEffect(() => {
    breadcrumbService.setBreadcrumbs('repositoryEdit');
    docTitleService.setTitle('repositoryEdit');
  }, []);

  // Repository state with default empty repository
  const [repository, setRepository] = useState<Repository | EmptyRepository>({
    name: '',
    type: null,
    settings: {},
  });

  // Load repository
  const {
    error: repositoryError,
    isLoading: loadingRepository,
    data: repositoryData,
  } = useLoadRepository(name);

  // Update repository state when data is loaded
  useEffect(() => {
    if (repositoryData && repositoryData.repository) {
      setRepository(repositoryData.repository);
    }
  }, [repositoryData]);

  // Default repository state — initialized lazily once defaultRepository is known
  const [isDefaultRepository, setIsDefaultRepository] = useState<boolean>(
    () => defaultRepository === name
  );
  const [pendingRepository, setPendingRepository] = useState<Repository | EmptyRepository | null>(
    null
  );
  const confirmModalTitleId = useGeneratedHtmlId();

  // Saving repository states
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<any>(null);

  const doSave = async (editedRepository: Repository | EmptyRepository) => {
    setIsSaving(true);
    setSaveError(null);
    const { error } = await editRepository(editedRepository);
    setIsSaving(false);
    if (error) {
      setSaveError(error);
    } else {
      if (isDefaultRepository) {
        setDefaultRepository(name);
      }

      toastNotifications.addSuccess({
        title: i18n.translate('xpack.snapshotRestore.editRepository.successNotificationTitle', {
          defaultMessage: "Saved repository ''{name}''",
          values: { name },
        }),
        iconType: 'check',
      });

      history.push(`${BASE_PATH}/repositories`);
    }
  };

  // Save repository — intercept to confirm when changing the default
  const onSave = (editedRepository: Repository | EmptyRepository) => {
    if (isDefaultRepository && defaultRepository && defaultRepository !== name) {
      setPendingRepository(editedRepository);
      return;
    }
    doSave(editedRepository);
  };

  const renderLoading = () => {
    return (
      <PageLoading>
        <FormattedMessage
          id="xpack.snapshotRestore.editRepository.loadingRepositoryDescription"
          defaultMessage="Loading repository details…"
        />
      </PageLoading>
    );
  };

  const renderError = () => {
    const notFound = (repositoryError as any).status === 404;
    const errorObject = notFound
      ? {
          data: {
            error: i18n.translate(
              'xpack.snapshotRestore.editRepository.repositoryNotFoundErrorMessage',
              {
                defaultMessage: `The repository ''{name}'' does not exist.`,
                values: {
                  name,
                },
              }
            ),
          },
        }
      : repositoryError;
    return (
      <PageError
        title={
          <FormattedMessage
            id="xpack.snapshotRestore.editRepository.loadingRepositoryErrorTitle"
            defaultMessage="Error loading repository details"
          />
        }
        error={errorObject as Error}
      />
    );
  };

  if (loadingRepository) {
    return renderLoading();
  }

  if (repositoryError) {
    return renderError();
  }

  const { isManagedRepository } = repositoryData;

  const clearSaveError = () => {
    setSaveError(null);
  };

  const renderSaveError = () => {
    return saveError ? (
      <SectionError
        title={
          <FormattedMessage
            id="xpack.snapshotRestore.editRepository.savingRepositoryErrorTitle"
            defaultMessage="Cannot save repository"
          />
        }
        error={saveError}
      />
    ) : null;
  };

  const renderConfirmDefaultModal = () => {
    if (!pendingRepository) {
      return null;
    }
    return (
      <EuiConfirmModal
        aria-labelledby={confirmModalTitleId}
        titleProps={{ id: confirmModalTitleId }}
        title={
          <FormattedMessage
            id="xpack.snapshotRestore.editRepository.confirmDefaultModal.title"
            defaultMessage="Change default repository?"
          />
        }
        onCancel={() => setPendingRepository(null)}
        onConfirm={() => {
          const repo = pendingRepository;
          setPendingRepository(null);
          doSave(repo);
        }}
        cancelButtonText={
          <FormattedMessage
            id="xpack.snapshotRestore.editRepository.confirmDefaultModal.cancelButtonLabel"
            defaultMessage="Cancel"
          />
        }
        confirmButtonText={
          <FormattedMessage
            id="xpack.snapshotRestore.editRepository.confirmDefaultModal.confirmButtonLabel"
            defaultMessage="Change default"
          />
        }
        maxWidth={440}
        data-test-subj="confirmDefaultRepositoryModal"
      >
        <p>
          <FormattedMessage
            id="xpack.snapshotRestore.editRepository.confirmDefaultModal.description"
            defaultMessage="By making this change, all data streams will now write their snapshots to {newDefault} instead of {currentDefault}. Are you sure you wish to proceed?"
            values={{
              currentDefault: <strong>'{defaultRepository}'</strong>,
              newDefault: <strong>'{pendingRepository?.name}'</strong>,
            }}
          />
        </p>
      </EuiConfirmModal>
    );
  };

  return (
    <Fragment>
      {renderConfirmDefaultModal()}
      <EuiPageSection restrictWidth style={{ width: '100%' }}>
        <EuiPageHeader
          pageTitle={
            <span data-test-subj="pageTitle">
              <FormattedMessage
                id="xpack.snapshotRestore.editRepositoryTitle"
                defaultMessage="Edit repository"
              />
            </span>
          }
        />

        <EuiSpacer size="l" />

        {isManagedRepository ? (
          <>
            <EuiCallOut
              announceOnMount
              size="m"
              color="warning"
              iconType="info"
              title={
                <FormattedMessage
                  id="xpack.snapshotRestore.editRepository.managedRepositoryWarningTitle"
                  defaultMessage="This is a managed repository. Changing this repository might affect other systems that use it. Proceed with caution."
                />
              }
            />
            <EuiSpacer size="l" />
          </>
        ) : null}

        <RepositoryForm
          repository={repository}
          isManagedRepository={isManagedRepository}
          isEditing={true}
          isSaving={isSaving}
          saveError={renderSaveError()}
          clearSaveError={clearSaveError}
          onSave={onSave}
          onCancel={() => history.push(`${BASE_PATH}/repositories`)}
          isDefaultRepository={isDefaultRepository}
          isAlreadyDefaultRepository={defaultRepository === name}
          isFirstRepository={isOnlyRepository}
          onToggleDefault={setIsDefaultRepository}
        />
      </EuiPageSection>
    </Fragment>
  );
};
