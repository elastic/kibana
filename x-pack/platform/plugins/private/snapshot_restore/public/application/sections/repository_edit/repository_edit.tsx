/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { RouteComponentProps } from 'react-router-dom';

import { EuiCallOut, EuiPageSection, EuiPageHeader, EuiSpacer } from '@elastic/eui';
import type { Repository, EmptyRepository } from '../../../../common/types';

import type { Error } from '../../../shared_imports';
import { PageError, SectionError } from '../../../shared_imports';
import { ConfirmDefaultRepositoryModal, RepositoryForm, PageLoading } from '../../components';
import type { Section } from '../../constants';
import { BASE_PATH } from '../../constants';
import { useServices, useToastNotifications } from '../../app_context';
import { breadcrumbService, docTitleService } from '../../services/navigation';
import { useCanSetDefaultRepository } from '../../services/authorization';
import { editRepository, useLoadRepository } from '../../services/http';
import { useDefaultRepository } from '../../services/use_default_repository';
import { useDecodedParams } from '../../lib';

interface MatchParams {
  name: string;
}

export const RepositoryEdit: React.FunctionComponent<RouteComponentProps<MatchParams>> = ({
  history,
}) => {
  const { i18n } = useServices();
  const toastNotifications = useToastNotifications();
  const canSetDefaultRepository = useCanSetDefaultRepository();
  const { name } = useDecodedParams<MatchParams>();
  const section = 'repositories' as Section;

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

  // Saving repository states
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<any>(null);
  const [isDefaultRepository, setIsDefaultRepository] = useState<boolean>(false);
  const [pendingSave, setPendingSave] = useState<Repository | EmptyRepository | null>(null);

  const {
    defaultRepository,
    isLoadingDefaultRepository,
    defaultRepositoryStatus,
    setDefaultRepository: setDefaultRepositoryRequest,
  } = useDefaultRepository();
  const normalizedDefaultRepository = defaultRepository?.trim() ? defaultRepository : null;
  const defaultRepositoryLoadError = defaultRepositoryStatus === 'error';
  const canSetOrChangeDefaultRepository = canSetDefaultRepository && !defaultRepositoryLoadError;
  const isAlreadyDefaultRepository = defaultRepository === name;
  const isDefaultRepositoryKnown = defaultRepositoryStatus === 'loaded';

  const onCancel = () => {
    history.push(`${BASE_PATH}/${encodeURIComponent(section)}`);
  };

  // Save repository
  const doSave = async (editedRepository: Repository | EmptyRepository) => {
    setIsSaving(true);
    setSaveError(null);
    const { error } = await editRepository(editedRepository);
    setIsSaving(false);
    if (error) {
      setSaveError(error);
    } else {
      const shouldSetDefault =
        canSetOrChangeDefaultRepository && isDefaultRepository && !isAlreadyDefaultRepository;
      if (shouldSetDefault) {
        const defaultResponse = await setDefaultRepositoryRequest(name);
        if (defaultResponse.error) {
          toastNotifications.addDanger(
            i18n.translate('xpack.snapshotRestore.editRepository.setDefaultErrorMessage', {
              defaultMessage: 'Repository saved, but default repository could not be updated.',
            })
          );
        }
      }

      toastNotifications.addSuccess(
        i18n.translate('xpack.snapshotRestore.editRepository.successMessage', {
          defaultMessage: "Saved repository ''{name}''",
          values: { name },
        })
      );

      history.push(encodeURI(`${BASE_PATH}/${encodeURIComponent(section)}`));
    }
  };

  const onSave = async (editedRepository: Repository | EmptyRepository) => {
    const shouldSetDefault =
      canSetOrChangeDefaultRepository && isDefaultRepository && !isAlreadyDefaultRepository;
    const isChangingDefault =
      shouldSetDefault &&
      isDefaultRepositoryKnown &&
      normalizedDefaultRepository !== null &&
      normalizedDefaultRepository !== name;

    if (isChangingDefault) {
      setPendingSave(editedRepository);
      return;
    }

    await doSave(editedRepository);
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

  if (loadingRepository || isLoadingDefaultRepository) {
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

  return (
    <EuiPageSection restrictWidth style={{ width: '100%' }}>
      {canSetOrChangeDefaultRepository && pendingSave && normalizedDefaultRepository !== null && (
        <ConfirmDefaultRepositoryModal
          currentDefaultRepository={normalizedDefaultRepository}
          newDefaultRepository={name}
          onCancel={() => setPendingSave(null)}
          onConfirm={() => {
            void doSave(pendingSave);
            setPendingSave(null);
          }}
        />
      )}
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

      {defaultRepositoryLoadError && (
        <>
          <EuiCallOut
            announceOnMount={false}
            color="warning"
            iconType="warning"
            title={
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryForm.defaultRepositoryLoadErrorCalloutTitle"
                defaultMessage="Default repository could not be loaded"
              />
            }
          >
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryForm.defaultRepositoryLoadErrorCalloutDescription"
              defaultMessage="You can still save repositories, but you can’t set or change the default repository right now. Try refreshing the page."
            />
          </EuiCallOut>
          <EuiSpacer size="l" />
        </>
      )}

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
        onCancel={onCancel}
        isAlreadyDefaultRepository={isAlreadyDefaultRepository}
        isDefaultRepository={isAlreadyDefaultRepository ? true : isDefaultRepository}
        onToggleDefault={canSetOrChangeDefaultRepository ? setIsDefaultRepository : undefined}
      />
    </EuiPageSection>
  );
};
