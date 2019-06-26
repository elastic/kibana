/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useState, useEffect } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { parse } from 'querystring';

import { EuiButton, EuiCallOut, EuiIcon, EuiLink, EuiEmptyPrompt, EuiSpacer } from '@elastic/eui';

import { SectionError, SectionLoading } from '../../../components';
import { BASE_PATH, UIM_SNAPSHOT_LIST_LOAD } from '../../../constants';
import { useAppDependencies } from '../../../index';
import { documentationLinksService } from '../../../services/documentation';
import { loadSnapshots } from '../../../services/http';
import { linkToRepositories } from '../../../services/navigation';
import { uiMetricService } from '../../../services/ui_metric';

import { SnapshotDetails } from './snapshot_details';
import { SnapshotTable } from './snapshot_table';

interface MatchParams {
  repositoryName?: string;
  snapshotId?: string;
}

export const SnapshotList: React.FunctionComponent<RouteComponentProps<MatchParams>> = ({
  match: {
    params: { repositoryName, snapshotId },
  },
  location: { search },
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
    data: { snapshots = [], repositories = [], errors = {} },
    request: reload,
  } = loadSnapshots();

  const openSnapshotDetailsUrl = (
    repositoryNameToOpen: string,
    snapshotIdToOpen: string
  ): string => {
    return history.createHref({
      pathname: `${BASE_PATH}/snapshots/${encodeURIComponent(
        repositoryNameToOpen
      )}/${encodeURIComponent(snapshotIdToOpen)}`,
    });
  };

  const closeSnapshotDetails = () => {
    history.push(`${BASE_PATH}/snapshots`);
  };

  // Allow deeplinking to list pre-filtered by repository name
  const [filteredRepository, setFilteredRepository] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (search) {
      const parsedParams = parse(search.replace(/^\?/, ''));
      if (parsedParams.repository && parsedParams.repository !== filteredRepository) {
        setFilteredRepository(String(parsedParams.repository));
        history.replace(`${BASE_PATH}/snapshots`);
      }
    }
  }, []);

  // Track component loaded
  const { trackUiMetric } = uiMetricService;
  useEffect(() => {
    trackUiMetric(UIM_SNAPSHOT_LIST_LOAD);
  }, []);

  let content;

  if (loading) {
    content = (
      <SectionLoading>
        <FormattedMessage
          id="xpack.snapshotRestore.snapshotList.loadingSnapshotsDescription"
          defaultMessage="Loading snapshots…"
        />
      </SectionLoading>
    );
  } else if (error) {
    content = (
      <SectionError
        title={
          <FormattedMessage
            id="xpack.snapshotRestore.snapshotList.loadingSnapshotsErrorMessage"
            defaultMessage="Error loading snapshots"
          />
        }
        error={error}
      />
    );
  } else if (Object.keys(errors).length && repositories.length === 0) {
    content = (
      <EuiEmptyPrompt
        iconType="managementApp"
        title={
          <h1 data-test-subj="title">
            <FormattedMessage
              id="xpack.snapshotRestore.snapshotList.emptyPrompt.errorRepositoriesTitle"
              defaultMessage="Some repositories contain errors"
            />
          </h1>
        }
        body={
          <Fragment>
            <p>
              <FormattedMessage
                id="xpack.snapshotRestore.snapshotList.emptyPrompt.repositoryWarningDescription"
                defaultMessage="Go to {repositoryLink} to fix the errors."
                values={{
                  repositoryLink: (
                    <EuiLink href={linkToRepositories()}>
                      <FormattedMessage
                        id="xpack.snapshotRestore.repositoryWarningLinkText"
                        defaultMessage="Repositories"
                      />
                    </EuiLink>
                  ),
                }}
              />
            </p>
            <p>
              <EuiLink
                href={documentationLinksService.getSnapshotDocUrl()}
                target="_blank"
                data-test-subj="srSnapshotsEmptyPromptDocLink"
              >
                <FormattedMessage
                  id="xpack.snapshotRestore.emptyPrompt.noSnapshotsDocLinkText"
                  defaultMessage="Learn how to create a snapshot"
                />{' '}
                <EuiIcon type="link" />
              </EuiLink>
            </p>
          </Fragment>
        }
      />
    );
  } else if (repositories.length === 0) {
    content = (
      <EuiEmptyPrompt
        iconType="managementApp"
        title={
          <h1 data-test-subj="title">
            <FormattedMessage
              id="xpack.snapshotRestore.snapshotList.emptyPrompt.noRepositoriesTitle"
              defaultMessage="You don't have any snapshots or repositories yet"
            />
          </h1>
        }
        body={
          <Fragment>
            <p>
              <FormattedMessage
                id="xpack.snapshotRestore.snapshotList.emptyPrompt.noRepositoriesDescription"
                defaultMessage="Start by registering a repository for your snapshots."
              />
            </p>
            <p>
              <EuiButton
                href={history.createHref({
                  pathname: `${BASE_PATH}/add_repository`,
                })}
                fill
                iconType="plusInCircle"
                data-test-subj="registerRepositoryButton"
              >
                <FormattedMessage
                  id="xpack.snapshotRestore.snapshotList.emptyPrompt.noRepositoriesAddButtonLabel"
                  defaultMessage="Register a repository"
                />
              </EuiButton>
            </p>
          </Fragment>
        }
        data-test-subj="emptyPrompt"
      />
    );
  } else if (snapshots.length === 0) {
    content = (
      <EuiEmptyPrompt
        iconType="managementApp"
        title={
          <h1 data-test-subj="title">
            <FormattedMessage
              id="xpack.snapshotRestore.snapshotList.emptyPrompt.noSnapshotsTitle"
              defaultMessage="You don't have any snapshots yet"
            />
          </h1>
        }
        body={
          <Fragment>
            <p>
              <FormattedMessage
                id="xpack.snapshotRestore.snapshotList.emptyPrompt.noSnapshotsDescription"
                defaultMessage="Create a snapshot using the Elasticsearch API."
              />
            </p>
            <p>
              <EuiLink
                href={documentationLinksService.getSnapshotDocUrl()}
                target="_blank"
                data-test-subj="documentationLink"
              >
                <FormattedMessage
                  id="xpack.snapshotRestore.emptyPrompt.noSnapshotsDocLinkText"
                  defaultMessage="Learn how to create a snapshot"
                />{' '}
                <EuiIcon type="link" />
              </EuiLink>
            </p>
          </Fragment>
        }
        data-test-subj="emptyPrompt"
      />
    );
  } else {
    const repositoryErrorsWarning = Object.keys(errors).length ? (
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryWarningTitle"
            defaultMessage="Some repositories contain errors"
          />
        }
        color="warning"
        iconType="alert"
      >
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryWarningDescription"
          defaultMessage="Snapshots might load slowly. Go to {repositoryLink} to fix the errors."
          values={{
            repositoryLink: (
              <EuiLink href={linkToRepositories()}>
                <FormattedMessage
                  id="xpack.snapshotRestore.repositoryWarningLinkText"
                  defaultMessage="Repositories"
                />
              </EuiLink>
            ),
          }}
        />
      </EuiCallOut>
    ) : null;

    content = (
      <Fragment>
        {repositoryErrorsWarning}

        <EuiSpacer />

        <SnapshotTable
          snapshots={snapshots}
          repositories={repositories}
          reload={reload}
          openSnapshotDetailsUrl={openSnapshotDetailsUrl}
          repositoryFilter={filteredRepository}
        />
      </Fragment>
    );
  }

  return (
    <section data-test-subj="snapshotList">
      {repositoryName && snapshotId ? (
        <SnapshotDetails
          repositoryName={repositoryName}
          snapshotId={snapshotId}
          onClose={closeSnapshotDetails}
        />
      ) : null}
      {content}
    </section>
  );
};
