/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useEffect } from 'react';
import { RouteComponentProps } from 'react-router-dom';

import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import { Repository } from '../../../../../common/types';
import { SectionError, SectionLoading } from '../../../components';
import { BASE_PATH, UIM_REPOSITORY_LIST_LOAD } from '../../../constants';
import { useAppDependencies } from '../../../index';
import { loadRepositories } from '../../../services/http';
import { uiMetricService } from '../../../services/ui_metric';

import { RepositoryDetails } from './repository_details';
import { RepositoryTable } from './repository_table';

interface MatchParams {
  repositoryName?: Repository['name'];
}

export const RepositoryList: React.FunctionComponent<RouteComponentProps<MatchParams>> = ({
  match: {
    params: { repositoryName },
  },
  history,
}) => {
  const {
    core: {
      i18n: { FormattedMessage },
    },
  } = useAppDependencies();

  const {
    error,
    loading,
    data: { repositories, managedRepository } = {
      repositories: undefined,
      managedRepository: undefined,
    },
    request: reload,
  } = loadRepositories();

  const openRepositoryDetailsUrl = (newRepositoryName: Repository['name']): string => {
    return history.createHref({
      pathname: `${BASE_PATH}/repositories/${newRepositoryName}`,
    });
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
  const { trackUiMetric } = uiMetricService;
  useEffect(() => {
    trackUiMetric(UIM_REPOSITORY_LIST_LOAD);
  }, []);

  let content;

  if (loading) {
    content = (
      <SectionLoading>
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryList.loadingRepositoriesDescription"
          defaultMessage="Loading repositories…"
        />
      </SectionLoading>
    );
  } else if (error) {
    content = (
      <SectionError
        title={
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryList.LoadingRepositoriesErrorMessage"
            defaultMessage="Error loading repositories"
          />
        }
        error={error}
      />
    );
  } else if (repositories && repositories.length === 0) {
    content = (
      <EuiEmptyPrompt
        iconType="managementApp"
        title={
          <h1>
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryList.emptyPromptTitle"
              defaultMessage="You don't have any repositories yet"
            />
          </h1>
        }
        body={
          <Fragment>
            <p>
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryList.emptyPromptDescription"
                defaultMessage="You need a repository to store your snapshots."
              />
            </p>
          </Fragment>
        }
        actions={
          <EuiButton
            href={history.createHref({
              pathname: `${BASE_PATH}/add_repository`,
            })}
            fill
            iconType="plusInCircle"
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
      <RepositoryTable
        repositories={repositories || []}
        managedRepository={managedRepository}
        reload={reload}
        openRepositoryDetailsUrl={openRepositoryDetailsUrl}
        onRepositoryDeleted={onRepositoryDeleted}
      />
    );
  }

  return (
    <section data-test-subj="repositoryList">
      {repositoryName ? (
        <RepositoryDetails
          repositoryName={repositoryName}
          onClose={closeRepositoryDetails}
          onRepositoryDeleted={onRepositoryDeleted}
        />
      ) : null}
      {content}
    </section>
  );
};
