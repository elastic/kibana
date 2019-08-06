/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useState } from 'react';

import {
  EuiDescribedFormGroup,
  EuiTitle,
  EuiFormRow,
  EuiFieldText,
  EuiSelect,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiLink,
  EuiSpacer,
} from '@elastic/eui';
import { Repository } from '../../../../../common/types';
import { useLoadRepositories } from '../../../services/http';
import { linkToAddRepository } from '../../../services/navigation';
import { documentationLinksService } from '../../../services/documentation';
import { useAppDependencies } from '../../../index';
import { SectionLoading, SectionError } from '../../';
import { StepProps } from './';

export const PolicyStepLogistics: React.FunctionComponent<StepProps> = ({
  policy,
  updatePolicy,
  isEditing,
  currentUrl,
  errors,
}) => {
  const {
    core: { i18n },
  } = useAppDependencies();
  const { FormattedMessage } = i18n;

  // Load repositories for repository dropdown field
  const {
    error: errorLoadingRepositories,
    isLoading: isLoadingRepositories,
    data: { repositories } = {
      repositories: [],
    },
    sendRequest: reloadRepositories,
  } = useLoadRepositories();

  // State for touched inputs
  const [touched, setTouched] = useState({
    name: false,
    snapshotName: false,
    repository: false,
    schedule: false,
  });

  const renderNameField = () => (
    <EuiDescribedFormGroup
      title={
        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              id="xpack.snapshotRestore.policyForm.stepLogistics.nameDescriptionTitle"
              defaultMessage="Policy name"
            />
          </h3>
        </EuiTitle>
      }
      description={
        <FormattedMessage
          id="xpack.snapshotRestore.policyForm.stepLogistics.nameDescription"
          defaultMessage="A unique name for the policy."
        />
      }
      idAria="nameDescription"
      fullWidth
    >
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.snapshotRestore.policyForm.stepLogistics.nameLabel"
            defaultMessage="Name"
          />
        }
        describedByIds={['nameDescription']}
        isInvalid={touched.name && Boolean(errors.name)}
        error={errors.name}
        fullWidth
      >
        <EuiFieldText
          defaultValue={policy.name}
          fullWidth
          onFocus={() => setTouched({ ...touched, name: true })}
          onChange={e => {
            updatePolicy({
              name: e.target.value,
            });
          }}
          placeholder={i18n.translate(
            'xpack.snapshotRestore.policyForm.stepLogistics.namePlaceholder',
            {
              defaultMessage: 'daily-snapshots',
              description:
                'Example SLM policy name. Similar to index names, do not use spaces in translation.',
            }
          )}
          data-test-subj="nameInput"
          disabled={isEditing}
        />
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );

  const renderRepositoryField = () => (
    <EuiDescribedFormGroup
      title={
        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              id="xpack.snapshotRestore.policyForm.stepLogistics.repositoryDescriptionTitle"
              defaultMessage="Repository"
            />
          </h3>
        </EuiTitle>
      }
      description={
        <FormattedMessage
          id="xpack.snapshotRestore.policyForm.stepLogistics.repositoryDescription"
          defaultMessage="Repository to store snapshots taken by this policy."
        />
      }
      idAria="policyRepositoryDescription"
      fullWidth
    >
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.snapshotRestore.policyForm.stepLogistics.policyRepositoryLabel"
            defaultMessage="Repository"
          />
        }
        describedByIds={['policyRepositoryDescription']}
        isInvalid={touched.repository && Boolean(errors.repository)}
        error={errors.repository}
        fullWidth
      >
        {renderRepositorySelect()}
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );

  const renderRepositorySelect = () => {
    if (isLoadingRepositories) {
      return (
        <SectionLoading inline={true}>
          <FormattedMessage
            id="xpack.snapshotRestore.policyForm.loadingRepositoriesDescription"
            defaultMessage="Loading repositories…"
          />
        </SectionLoading>
      );
    }

    if (errorLoadingRepositories) {
      return (
        <SectionError
          title={
            <FormattedMessage
              id="xpack.snapshotRestore.policyForm.loadingRepositoriesErrorMessage"
              defaultMessage="Error loading repositories"
            />
          }
          error={{ data: { error: 'test' } } || errorLoadingRepositories}
          actions={
            <EuiButton
              onClick={() => reloadRepositories()}
              color="danger"
              iconType="refresh"
              data-test-subj="reloadRepositoriesButton"
            >
              <FormattedMessage
                id="xpack.snapshotRestore.policyForm.reloadRepositoriesButtonLabel"
                defaultMessage="Reload repositories"
              />
            </EuiButton>
          }
        />
      );
    }

    if (repositories.length === 0) {
      return (
        <SectionError
          title={
            <FormattedMessage
              id="xpack.snapshotRestore.policyForm.noRepositoriesErrorTitle"
              defaultMessage="You don't have any repositories"
            />
          }
          error={{
            data: {
              error: i18n.translate('xpack.snapshotRestore.policyForm.noRepositoriesErrorMessage', {
                defaultMessage: 'A repository is required to store snapshots.',
              }),
            },
          }}
          actions={
            <EuiButton
              href={linkToAddRepository(currentUrl)}
              color="danger"
              iconType="plusInCircle"
              data-test-subj="addRepositoryButton"
            >
              <FormattedMessage
                id="xpack.snapshotRestore.policyForm.addRepositoryButtonLabel"
                defaultMessage="Register a repository"
              />
            </EuiButton>
          }
        />
      );
    } else {
      if (!policy.repository) {
        updatePolicy({
          repository: repositories[0].name,
        });
      }
    }

    return (
      <EuiSelect
        options={repositories.map(({ name }: Repository) => ({
          value: name,
          text: name,
        }))}
        value={policy.repository || repositories[0].name}
        onFocus={() => setTouched({ ...touched, repository: true })}
        onChange={e => {
          updatePolicy({
            repository: e.target.value,
          });
        }}
        fullWidth
        data-test-subj="repositorySelect"
      />
    );
  };

  const renderSnapshotNameField = () => (
    <EuiDescribedFormGroup
      title={
        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              id="xpack.snapshotRestore.policyForm.stepLogistics.snapshotNameDescriptionTitle"
              defaultMessage="Snapshot name"
            />
          </h3>
        </EuiTitle>
      }
      description={
        <FormattedMessage
          id="xpack.snapshotRestore.policyForm.stepLogistics.snapshotNameDescription"
          defaultMessage="Name for the automatic snapshots taken by this policy.
            Supports date math expressions to easily identify snapshots."
        />
      }
      idAria="policySnapshotNameDescription"
      fullWidth
    >
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.snapshotRestore.policyForm.stepLogistics.policySnapshotNameLabel"
            defaultMessage="Snapshot name"
          />
        }
        describedByIds={['policySnapshotNameDescription']}
        isInvalid={touched.snapshotName && Boolean(errors.snapshotName)}
        error={errors.snapshotName}
        helpText={
          <FormattedMessage
            id="xpack.snapshotRestore.policyForm.stepLogistics.policySnapshotNameHelpText"
            defaultMessage="Supports date math expressions. {docLink}"
            values={{
              docLink: (
                <EuiLink
                  href={documentationLinksService.getDateMathIndexNamesUrl()}
                  target="_blank"
                >
                  <FormattedMessage
                    id="xpack.snapshotRestore.policyForm.stepLogistics.policySnapshotNameHelpTextDocLink"
                    defaultMessage="Learn more"
                  />
                </EuiLink>
              ),
            }}
          />
        }
        fullWidth
      >
        <EuiFieldText
          defaultValue={policy.snapshotName}
          fullWidth
          onChange={e => {
            updatePolicy({
              snapshotName: e.target.value,
            });
          }}
          onFocus={() => setTouched({ ...touched, snapshotName: true })}
          placeholder={i18n.translate(
            'xpack.snapshotRestore.policyForm.stepLogistics.policySnapshotNamePlaceholder',
            {
              defaultMessage: '<daily-snap-\\{now/d\\}>',
              description:
                'Example date math snapshot name. Keeping the same syntax is important: <SOME-TRANSLATION-{now/d}>',
            }
          )}
          data-test-subj="snapshotNameInput"
        />
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );

  const renderScheduleField = () => (
    <EuiDescribedFormGroup
      title={
        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              id="xpack.snapshotRestore.policyForm.stepLogistics.scheduleDescriptionTitle"
              defaultMessage="Schedule"
            />
          </h3>
        </EuiTitle>
      }
      description={
        <FormattedMessage
          id="xpack.snapshotRestore.policyForm.stepLogistics.scheduleDescription"
          defaultMessage="How often to run this policy."
        />
      }
      idAria="policyScheduleDescription"
      fullWidth
    >
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.snapshotRestore.policyForm.stepLogistics.policyScheduleLabel"
            defaultMessage="Schedule"
          />
        }
        describedByIds={['policyScheduleDescription']}
        isInvalid={touched.schedule && Boolean(errors.schedule)}
        error={errors.schedule}
        helpText={
          <FormattedMessage
            id="xpack.snapshotRestore.policyForm.stepLogistics.policyScheduleHelpText"
            defaultMessage="Use cron expression. {docLink}"
            values={{
              docLink: (
                <EuiLink href={documentationLinksService.getCronUrl()} target="_blank">
                  <FormattedMessage
                    id="xpack.snapshotRestore.policyForm.stepLogistics.policyScheduleHelpTextDocLink"
                    defaultMessage="Learn more"
                  />
                </EuiLink>
              ),
            }}
          />
        }
        fullWidth
      >
        <EuiFieldText
          defaultValue={policy.schedule}
          fullWidth
          onChange={e => {
            updatePolicy({
              schedule: e.target.value,
            });
          }}
          onFocus={() => setTouched({ ...touched, schedule: true })}
          placeholder="0 30 1 * * ?"
          data-test-subj="snapshotNameInput"
        />
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );

  return (
    <Fragment>
      {/* Step title and doc link */}
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiTitle>
            <h3>
              <FormattedMessage
                id="xpack.snapshotRestore.policyForm.stepLogisticsTitle"
                defaultMessage="Logistics"
              />
            </h3>
          </EuiTitle>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            flush="right"
            href={documentationLinksService.getSlmUrl()}
            target="_blank"
            iconType="help"
          >
            <FormattedMessage
              id="xpack.snapshotRestore.policyForm.stepLogistics.docsButtonLabel"
              defaultMessage="Logistics docs"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="l" />

      {renderNameField()}
      {renderSnapshotNameField()}
      {renderRepositoryField()}
      {renderScheduleField()}
    </Fragment>
  );
};
