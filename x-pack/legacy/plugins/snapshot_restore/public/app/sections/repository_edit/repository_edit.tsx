/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect, useState, Fragment } from 'react';
import { RouteComponentProps } from 'react-router-dom';

import { EuiCallOut, EuiPageBody, EuiPageContent, EuiSpacer, EuiTitle } from '@elastic/eui';
import { Repository, EmptyRepository } from '../../../../common/types';

import { RepositoryForm, SectionError, SectionLoading, Error } from '../../components';
import { BASE_PATH, Section } from '../../constants';
import { useAppDependencies } from '../../index';
import { breadcrumbService, docTitleService } from '../../services/navigation';
import { editRepository, useLoadRepository } from '../../services/http';

interface MatchParams {
  name: string;
}

export const RepositoryEdit: React.FunctionComponent<RouteComponentProps<MatchParams>> = ({
  match: {
    params: { name },
  },
  history,
}) => {
  const {
    core: { i18n },
  } = useAppDependencies();
  const { FormattedMessage } = i18n;
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

  // Save repository
  const onSave = async (editedRepository: Repository | EmptyRepository) => {
    setIsSaving(true);
    setSaveError(null);
    const { error } = await editRepository(editedRepository);
    setIsSaving(false);
    if (error) {
      setSaveError(error);
    } else {
      history.push(`${BASE_PATH}/${section}/${name}`);
    }
  };

  const renderLoading = () => {
    return (
      <SectionLoading>
        <FormattedMessage
          id="xpack.snapshotRestore.editRepository.loadingRepositoryDescription"
          defaultMessage="Loading repository details…"
        />
      </SectionLoading>
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
                defaultMessage: `The repository '{name}' does not exist.`,
                values: {
                  name,
                },
              }
            ),
          },
        }
      : repositoryError;
    return (
      <SectionError
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

  const clearSaveError = () => {
    setSaveError(null);
  };

  const renderContent = () => {
    if (loadingRepository) {
      return renderLoading();
    }
    if (repositoryError) {
      return renderError();
    }

    const { isManagedRepository } = repositoryData;

    return (
      <Fragment>
        {isManagedRepository ? (
          <Fragment>
            <EuiCallOut
              size="m"
              color="warning"
              iconType="iInCircle"
              title={
                <FormattedMessage
                  id="xpack.snapshotRestore.editRepository.managedRepositoryWarningTitle"
                  defaultMessage="This is a managed repository. Changing this repository might affect other systems that use it. Proceed with caution."
                />
              }
            />
            <EuiSpacer size="l" />
          </Fragment>
        ) : null}
        <RepositoryForm
          repository={repository}
          isManagedRepository={isManagedRepository}
          isEditing={true}
          isSaving={isSaving}
          saveError={renderSaveError()}
          clearSaveError={clearSaveError}
          onSave={onSave}
        />
      </Fragment>
    );
  };

  return (
    <EuiPageBody>
      <EuiPageContent>
        <EuiTitle size="l">
          <h1>
            <FormattedMessage
              id="xpack.snapshotRestore.editRepositoryTitle"
              defaultMessage="Edit repository"
            />
          </h1>
        </EuiTitle>
        <EuiSpacer size="l" />
        {renderContent()}
      </EuiPageContent>
    </EuiPageBody>
  );
};
