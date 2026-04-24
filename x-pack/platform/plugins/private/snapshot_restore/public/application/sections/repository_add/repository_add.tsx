/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'query-string';
import React, { useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { RouteComponentProps } from 'react-router-dom';

import { EuiPageSection, EuiSpacer, EuiPageHeader } from '@elastic/eui';
import { SectionError } from '@kbn/es-ui-shared-plugin/public';
import type { Repository, EmptyRepository } from '../../../../common/types';

import { ConfirmDefaultRepositoryModal, PageLoading, RepositoryForm } from '../../components';
import type { Section } from '../../constants';
import { BASE_PATH } from '../../constants';
import { useServices, useToastNotifications } from '../../app_context';
import { breadcrumbService, docTitleService } from '../../services/navigation';
import { addRepository, useLoadRepositories } from '../../services/http';
import { useDefaultRepository } from '../../services/use_default_repository';

export const RepositoryAdd: React.FunctionComponent<RouteComponentProps> = ({
  history,
  location: { search },
}) => {
  const section = 'repositories' as Section;
  const { i18n } = useServices();
  const toastNotifications = useToastNotifications();
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<any>(null);
  const [isDefaultRepository, setIsDefaultRepository] = useState<boolean>(false);
  const [pendingSave, setPendingSave] = useState<Repository | EmptyRepository | null>(null);

  const { data: { repositories } = { repositories: undefined }, isLoading: isLoadingRepositories } =
    useLoadRepositories();
  const isFirstRepository = !isLoadingRepositories && (repositories?.length ?? 0) === 0;

  const {
    defaultRepository,
    isLoadingDefaultRepository,
    setDefaultRepository: setDefaultRepositoryRequest,
  } = useDefaultRepository();

  // Set breadcrumb and page title
  useEffect(() => {
    breadcrumbService.setBreadcrumbs('repositoryAdd');
    docTitleService.setTitle('repositoryAdd');
  }, []);

  if (isLoadingRepositories || isLoadingDefaultRepository) {
    return (
      <PageLoading>
        <FormattedMessage
          id="xpack.snapshotRestore.addRepository.loadingDescription"
          defaultMessage="Loading…"
        />
      </PageLoading>
    );
  }

  const onCancel = () => {
    history.push(`${BASE_PATH}/${encodeURIComponent(section)}`);
  };

  const doSave = async (newRepository: Repository | EmptyRepository) => {
    setIsSaving(true);
    setSaveError(null);
    const { name } = newRepository;
    const { error } = await addRepository(newRepository);
    setIsSaving(false);
    if (error) {
      setSaveError(error);
    } else {
      const shouldSetDefault =
        isDefaultRepository || isFirstRepository || defaultRepository == null;

      if (shouldSetDefault) {
        const defaultResponse = await setDefaultRepositoryRequest(name);
        if (defaultResponse.error) {
          toastNotifications.addDanger(
            i18n.translate('xpack.snapshotRestore.addRepository.setDefaultErrorMessage', {
              defaultMessage: 'Repository registered, but default repository could not be updated.',
            })
          );
        }
      }

      toastNotifications.addSuccess(
        i18n.translate('xpack.snapshotRestore.addRepository.successMessage', {
          defaultMessage: "Registered repository ''{name}''",
          values: { name },
        })
      );

      const { redirect } = parse(search.replace(/^\?/, ''), { sort: false });

      history.push(
        redirect ? (redirect as string) : encodeURI(`${BASE_PATH}/${encodeURIComponent(section)}`)
      );
    }
  };

  const onSave = async (newRepository: Repository | EmptyRepository) => {
    const name = newRepository.name;
    const shouldSetDefault = isDefaultRepository || isFirstRepository || defaultRepository == null;
    const isChangingDefault =
      shouldSetDefault && Boolean(defaultRepository) && defaultRepository !== name;

    if (isChangingDefault) {
      setPendingSave(newRepository);
      return;
    }

    await doSave(newRepository);
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

  return (
    <EuiPageSection restrictWidth style={{ width: '100%' }}>
      {pendingSave && (
        <ConfirmDefaultRepositoryModal
          currentDefaultRepository={defaultRepository}
          newDefaultRepository={pendingSave.name}
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
        onCancel={onCancel}
        isFirstRepository={isFirstRepository}
        isDefaultRepository={isFirstRepository ? true : isDefaultRepository}
        onToggleDefault={setIsDefaultRepository}
      />
    </EuiPageSection>
  );
};
