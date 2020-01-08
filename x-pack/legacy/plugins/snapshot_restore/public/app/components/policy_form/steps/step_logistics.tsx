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
  EuiText,
} from '@elastic/eui';

import { Repository } from '../../../../../common/types';
import { CronEditor } from '../../../../shared_imports';
import { DEFAULT_POLICY_SCHEDULE, DEFAULT_POLICY_FREQUENCY } from '../../../constants';
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
    data: { repositories, managedRepository } = {
      repositories: [],
      managedRepository: {
        name: undefined,
      },
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

  // State for cron editor
  const [simpleCron, setSimpleCron] = useState<{
    expression: string;
    frequency: string;
  }>({
    expression: DEFAULT_POLICY_SCHEDULE,
    frequency: DEFAULT_POLICY_FREQUENCY,
  });
  const [isAdvancedCronVisible, setIsAdvancedCronVisible] = useState<boolean>(
    Boolean(policy.schedule && policy.schedule !== DEFAULT_POLICY_SCHEDULE)
  );
  const [fieldToPreferredValueMap, setFieldToPreferredValueMap] = useState<any>({});

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
          defaultMessage="A unique identifier for this policy."
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
          onBlur={() => setTouched({ ...touched, name: true })}
          onChange={e => {
            updatePolicy(
              {
                name: e.target.value,
              },
              {
                managedRepository,
                isEditing,
                policyName: policy.name,
              }
            );
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
          defaultMessage="The repository where you want to store the snapshots."
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
                defaultMessage: 'You must register a repository to store your snapshots.',
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
        updatePolicy(
          {
            repository: repositories[0].name,
          },
          {
            managedRepository,
            isEditing,
            policyName: policy.name,
          }
        );
      }
    }

    return (
      <EuiSelect
        options={repositories.map(({ name }: Repository) => ({
          value: name,
          text: name,
        }))}
        value={policy.repository || repositories[0].name}
        onBlur={() => setTouched({ ...touched, repository: true })}
        onChange={e => {
          updatePolicy(
            {
              repository: e.target.value,
            },
            {
              managedRepository,
              isEditing,
              policyName: policy.name,
            }
          );
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
          defaultMessage="The name for the snapshots. A unique identifier is automatically added to each name."
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
                    defaultMessage="Learn more."
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
            updatePolicy(
              {
                snapshotName: e.target.value.toLowerCase(),
              },
              {
                managedRepository,
                isEditing,
                policyName: policy.name,
              }
            );
          }}
          onBlur={() => setTouched({ ...touched, snapshotName: true })}
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
          defaultMessage="The frequency at which to take the snapshots."
        />
      }
      idAria="policyScheduleDescription"
      fullWidth
    >
      {isAdvancedCronVisible ? (
        <Fragment>
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
                        defaultMessage="Learn more."
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
                updatePolicy(
                  {
                    schedule: e.target.value,
                  },
                  {
                    managedRepository,
                    isEditing,
                    policyName: policy.name,
                  }
                );
              }}
              onBlur={() => setTouched({ ...touched, schedule: true })}
              placeholder={DEFAULT_POLICY_SCHEDULE}
              data-test-subj="advancedCronInput"
            />
          </EuiFormRow>

          <EuiSpacer size="m" />

          <EuiText size="s">
            <EuiLink
              onClick={() => {
                setIsAdvancedCronVisible(false);
                updatePolicy(
                  {
                    schedule: simpleCron.expression,
                  },
                  {
                    managedRepository,
                    isEditing,
                    policyName: policy.name,
                  }
                );
              }}
              data-test-subj="showBasicCronLink"
            >
              <FormattedMessage
                id="xpack.snapshotRestore.policyForm.stepLogistics.policyScheduleButtonBasicLabel"
                defaultMessage="Create basic interval"
              />
            </EuiLink>
          </EuiText>
        </Fragment>
      ) : (
        <Fragment>
          <CronEditor
            fieldToPreferredValueMap={fieldToPreferredValueMap}
            cronExpression={simpleCron.expression}
            frequency={simpleCron.frequency}
            onChange={({
              cronExpression: expression,
              frequency,
              fieldToPreferredValueMap: newFieldToPreferredValueMap,
            }: {
              cronExpression: string;
              frequency: string;
              fieldToPreferredValueMap: any;
            }) => {
              setSimpleCron({
                expression,
                frequency,
              });
              setFieldToPreferredValueMap(newFieldToPreferredValueMap);
              updatePolicy(
                {
                  schedule: expression,
                },
                {
                  managedRepository,
                  isEditing,
                  policyName: policy.name,
                }
              );
            }}
          />

          <EuiSpacer size="s" />

          <EuiText size="s">
            <EuiLink
              onClick={() => {
                setIsAdvancedCronVisible(true);
              }}
              data-test-subj="showAdvancedCronLink"
            >
              <FormattedMessage
                id="xpack.snapshotRestore.policyForm.stepLogistics.policyScheduleButtonAdvancedLabel"
                defaultMessage="Create cron expression"
              />
            </EuiLink>
          </EuiText>
        </Fragment>
      )}
    </EuiDescribedFormGroup>
  );

  return (
    <Fragment>
      {/* Step title and doc link */}
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiTitle>
            <h2>
              <FormattedMessage
                id="xpack.snapshotRestore.policyForm.stepLogisticsTitle"
                defaultMessage="Logistics"
              />
            </h2>
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
