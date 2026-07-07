/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { RouteComponentProps } from 'react-router-dom';
import { EuiButton, EuiPageTemplate, EuiCallOut, EuiSpacer } from '@elastic/eui';

import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';

import type { Repository } from '../../../../../common/types';
import type { Error } from '../../../../shared_imports';
import { PageLoading, PageError, useExecutionContext } from '../../../../shared_imports';
import { useDecodedParams } from '../../../lib';
import { BASE_PATH, UIM_REPOSITORY_LIST_LOAD } from '../../../constants';
import { useAppContext, useServices } from '../../../app_context';
import { useCanSetDefaultRepository } from '../../../services/authorization';
import { useLoadRepositories } from '../../../services/http';
import { useDefaultRepository } from '../../../services/use_default_repository';
import { linkToAddRepository, linkToRepository } from '../../../services/navigation';

import { RepositoryDetails } from './repository_details';
import { RepositoryTable } from './repository_table';

interface MatchParams {
  repositoryName?: Repository['name'];
}

export const RepositoryList: React.FunctionComponent<RouteComponentProps<MatchParams>> = ({
  history,
}) => {
  const canSetDefaultRepository = useCanSetDefaultRepository();
  const { repositoryName } = useDecodedParams<MatchParams>();
  const {
    error,
    isLoading,
    data: { repositories, managedRepository } = {
      repositories: undefined,
      managedRepository: {
        name: undefined,
      },
    },
    resendRequest: reload,
  } = useLoadRepositories();

  const { uiMetricService } = useServices();
  const { core } = useAppContext();
  const {
    defaultRepository,
    isLoadingDefaultRepository,
    defaultRepositoryStatus,
    reloadDefaultRepository,
    setDefaultRepository,
  } = useDefaultRepository();
  const defaultRepositoryLoadError = defaultRepositoryStatus === 'error';
  const isDefaultRepositoryFeatureAvailable = !defaultRepositoryLoadError;

  const reloadRepositoriesAndDefault = () => {
    reload();
    reloadDefaultRepository();
  };

  const openRepositoryDetailsUrl = (newRepositoryName: Repository['name']): string => {
    return linkToRepository(newRepositoryName);
  };

  const closeRepositoryDetails = () => {
    history.push(`${BASE_PATH}/repositories`);
  };

  const onRepositoryDeleted = (repositoriesDeleted: Array<Repository['name']>): void => {
    if (repositoryName && repositoriesDeleted.includes(repositoryName)) {
      closeRepositoryDetails();
    }
    if (repositoriesDeleted.length) {
      reload();
    }
  };

  // Track component loaded
  useEffect(() => {
    uiMetricService.trackUiMetric(UIM_REPOSITORY_LIST_LOAD);
  }, [uiMetricService]);

  useExecutionContext(core.executionContext, {
    type: 'application',
    page: 'snapshotRestoreRepositoryTab',
  });

  let content;

  if (isLoading || isLoadingDefaultRepository) {
    content = (
      <PageLoading>
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryList.loadingRepositoriesDescription"
          defaultMessage="Loading repositories…"
        />
      </PageLoading>
    );
  } else if (error) {
    content = (
      <PageError
        title={
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryList.LoadingRepositoriesErrorMessage"
            defaultMessage="Error loading repositories"
          />
        }
        error={error as Error}
      />
    );
  } else if (repositories && repositories.length === 0) {
    content = (
      <EuiPageTemplate.EmptyPrompt
        iconType="managementApp"
        title={
          <h1>
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryList.emptyPromptTitle"
              defaultMessage="Register your first repository"
            />
          </h1>
        }
        body={
          <Fragment>
            <p>
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryList.emptyPromptDescription"
                defaultMessage="Create a place where your snapshots will live."
              />
            </p>
          </Fragment>
        }
        actions={
          <EuiButton
            {...reactRouterNavigate(history, linkToAddRepository())}
            fill
            iconType="plusCircle"
            data-test-subj="registerRepositoryButton"
          >
            <FormattedMessage
              id="xpack.snapshotRestore.addRepositoryButtonLabel"
              defaultMessage="Register a repository"
            />
          </EuiButton>
        }
        data-test-subj="emptyPrompt"
      />
    );
  } else {
    content = (
      <section data-test-subj="repositoryList">
        {defaultRepositoryLoadError && (
          <>
            <EuiCallOut
              announceOnMount={false}
              color="warning"
              iconType="warning"
              title={
                <FormattedMessage
                  id="xpack.snapshotRestore.repositoryList.defaultRepositoryLoadErrorCalloutTitle"
                  defaultMessage="The default repository feature is currently unavailable"
                />
              }
            >
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryList.defaultRepositoryLoadErrorCalloutDescription"
                defaultMessage="Please try refreshing the page or returning at a later time."
              />
            </EuiCallOut>
            <EuiSpacer size="m" />
          </>
        )}
        <RepositoryTable
          repositories={repositories || []}
          managedRepository={managedRepository?.name}
          defaultRepository={defaultRepository}
          canSetDefaultRepository={canSetDefaultRepository}
          isDefaultRepositoryFeatureAvailable={isDefaultRepositoryFeatureAvailable}
          onSetDefaultRepository={setDefaultRepository}
          reload={reloadRepositoriesAndDefault}
          openRepositoryDetailsUrl={openRepositoryDetailsUrl}
          onRepositoryDeleted={onRepositoryDeleted}
        />
      </section>
    );
  }

  return (
    <>
      {repositoryName ? (
        <RepositoryDetails
          repositoryName={repositoryName}
          onClose={closeRepositoryDetails}
          onRepositoryDeleted={onRepositoryDeleted}
          isDefaultRepository={repositoryName === defaultRepository}
          isLoadingDefaultRepository={isLoadingDefaultRepository}
        />
      ) : null}
      {content}
    </>
  );
};
