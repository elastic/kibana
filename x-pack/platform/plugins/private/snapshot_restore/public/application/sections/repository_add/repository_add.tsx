/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'query-string';
import React, { Fragment, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { RouteComponentProps } from 'react-router-dom';

import { EuiConfirmModal, EuiPageSection, EuiSpacer, EuiPageHeader, useGeneratedHtmlId } from '@elastic/eui';
import { SectionError } from '@kbn/es-ui-shared-plugin/public';
import type { Repository, EmptyRepository } from '../../../../common/types';

import { RepositoryForm } from '../../components/repository_form';
import type { Section } from '../../constants';
import { BASE_PATH } from '../../constants';
import { useToastNotifications } from '../../app_context';
import { breadcrumbService, docTitleService } from '../../services/navigation';
import { addRepository, useLoadRepositories } from '../../services/http';
import { useDefaultRepository } from '../../services/use_default_repository';

export const RepositoryAdd: React.FunctionComponent<RouteComponentProps> = ({
  history,
  location: { search },
}) => {
  const section = 'repositories' as Section;
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<any>(null);
  const [isDefaultRepository, setIsDefaultRepository] = useState<boolean>(false);

  const { data: repositoriesData } = useLoadRepositories();
  const { defaultRepository, setDefaultRepository } = useDefaultRepository();
  const toastNotifications = useToastNotifications();
  const [pendingRepository, setPendingRepository] = useState<Repository | EmptyRepository | null>(
    null
  );
  const confirmModalTitleId = useGeneratedHtmlId();

  const isFirstRepository = !repositoriesData?.repositories?.length;

  // Set breadcrumb and page title
  useEffect(() => {
    breadcrumbService.setBreadcrumbs('repositoryAdd');
    docTitleService.setTitle('repositoryAdd');
  }, []);

  const doSave = async (newRepository: Repository | EmptyRepository) => {
    setIsSaving(true);
    setSaveError(null);
    const { name } = newRepository;
    const { error } = await addRepository(newRepository);
    setIsSaving(false);
    if (error) {
      setSaveError(error);
    } else {
      if (isFirstRepository || isDefaultRepository) {
        setDefaultRepository(name);
      }

      toastNotifications.addSuccess({
        title: i18n.translate('xpack.snapshotRestore.addRepository.successNotificationTitle', {
          defaultMessage: "Registered repository ''{name}''",
          values: { name },
        }),
        iconType: 'check',
      });

      const { redirect } = parse(search.replace(/^\?/, ''), { sort: false });

      history.push(
        redirect ? (redirect as string) : `${BASE_PATH}/repositories`
      );
    }
  };

  const onSave = (newRepository: Repository | EmptyRepository) => {
    if (isDefaultRepository && defaultRepository) {
      setPendingRepository(newRepository);
      return;
    }
    doSave(newRepository);
  };

  const emptyRepository = {
    name: '',
    type: null,
    settings: {},
  };

  const renderSaveError = () => {
    return saveError ? (
      <SectionError
        title={
          <FormattedMessage
            id="xpack.snapshotRestore.addRepository.savingRepositoryErrorTitle"
            defaultMessage="Cannot register new repository"
          />
        }
        error={saveError}
        data-test-subj="saveRepositoryApiError"
      />
    ) : null;
  };

  const clearSaveError = () => {
    setSaveError(null);
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
            id="xpack.snapshotRestore.addRepository.confirmDefaultModal.title"
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
            id="xpack.snapshotRestore.addRepository.confirmDefaultModal.cancelButtonLabel"
            defaultMessage="Cancel"
          />
        }
        confirmButtonText={
          <FormattedMessage
            id="xpack.snapshotRestore.addRepository.confirmDefaultModal.confirmButtonLabel"
            defaultMessage="Change default"
          />
        }
        maxWidth={440}
        data-test-subj="confirmDefaultRepositoryModal"
      >
        <p>
          <FormattedMessage
            id="xpack.snapshotRestore.addRepository.confirmDefaultModal.description"
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
                id="xpack.snapshotRestore.addRepositoryTitle"
                defaultMessage="Register repository"
              />
            </span>
          }
        />

        <EuiSpacer size="l" />

        <RepositoryForm
          repository={emptyRepository}
          isSaving={isSaving}
          saveError={renderSaveError()}
          clearSaveError={clearSaveError}
          onSave={onSave}
          onCancel={() => history.push(`${BASE_PATH}/repositories`)}
          isDefaultRepository={isDefaultRepository}
          isFirstRepository={isFirstRepository}
          onToggleDefault={setIsDefaultRepository}
        />
      </EuiPageSection>
    </Fragment>
  );
};
