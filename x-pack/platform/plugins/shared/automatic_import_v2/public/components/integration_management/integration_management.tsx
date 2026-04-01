/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import useObservable from 'react-use/lib/useObservable';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import {
  EuiButton,
  EuiConfirmModal,
  EuiEmptyPrompt,
  EuiLoadingSpinner,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { MINIMUM_LICENSE_TYPE } from '../../../common/constants';
import { ManagementContents } from './management_contents/management_contents';
import { ButtonsFooter } from '../../common/components/button_footer';
import { ConnectorSelector } from '../../common/components/connector_selector';
import { IntegrationFormProvider } from './forms/integration_form';
import type { IntegrationFormData } from './forms/types';
import { PAGE_RESTRICT_WIDTH } from './constants';
import * as i18n from './translations';
import { useDeleteIntegration, useGetIntegrationById, useKibana } from '../../common';
import { normalizeTitleName } from '../../common/lib/helper_functions';
import { useTelemetry } from '../telemetry_context';
import { LicensePaywallCard } from '../license_paywall/license_paywall_card';

const INTEGRATIONS_APP_ID = 'integrations';
const INTEGRATIONS_MANAGE_PATH = '/browse?view=manage';

const IntegrationManagementContents: React.FC = () => {
  const { application } = useKibana().services;
  const { integrationId } = useParams<{ integrationId?: string }>();
  const { integration } = useGetIntegrationById(integrationId);
  const { deleteIntegrationMutation } = useDeleteIntegration();
  const hasDataStreams = (integration?.dataStreams?.length ?? 0) > 0;
  const shouldOfferIntegrationDelete = Boolean(
    integrationId && integration && (integration.dataStreams?.length ?? 0) === 0
  );
  const [isDeleteIntegrationModalVisible, setIsDeleteIntegrationModalVisible] = useState(false);
  const deleteIntegrationModalTitleId = useGeneratedHtmlId();
  const { reportCancelButtonClicked, reportDoneButtonClicked, reportIntegrationDeleteConfirmed } =
    useTelemetry();

  const navigateToManage = useCallback(() => {
    application.navigateToApp(INTEGRATIONS_APP_ID, { path: INTEGRATIONS_MANAGE_PATH });
  }, [application]);

  const performCancelNavigation = useCallback(() => {
    reportCancelButtonClicked();
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigateToManage();
    }
  }, [navigateToManage, reportCancelButtonClicked]);

  const handleCancel = useCallback(() => {
    if (shouldOfferIntegrationDelete) {
      setIsDeleteIntegrationModalVisible(true);
      return;
    }
    performCancelNavigation();
  }, [performCancelNavigation, shouldOfferIntegrationDelete]);

  const handleDeleteIntegrationModalClose = useCallback(() => {
    setIsDeleteIntegrationModalVisible(false);
  }, []);

  const handleDeleteIntegrationConfirm = useCallback(async () => {
    if (!integrationId) {
      return;
    }
    try {
      await deleteIntegrationMutation.mutateAsync({ integrationId });
      setIsDeleteIntegrationModalVisible(false);
      reportIntegrationDeleteConfirmed();
      navigateToManage();
    } catch {
      // Error toast is shown by useDeleteIntegration
    }
  }, [
    deleteIntegrationMutation,
    integrationId,
    navigateToManage,
    reportIntegrationDeleteConfirmed,
  ]);

  const handleDone = useCallback(() => {
    reportDoneButtonClicked();
    navigateToManage();
  }, [navigateToManage, reportDoneButtonClicked]);

  return (
    <>
      <KibanaPageTemplate restrictWidth={PAGE_RESTRICT_WIDTH}>
        <KibanaPageTemplate.Header pageTitle={i18n.PAGE_TITLE_NEW_INTEGRATION} />
        <KibanaPageTemplate.Section>
          <ConnectorSelector />
          <ManagementContents />
        </KibanaPageTemplate.Section>
      </KibanaPageTemplate>
      <ButtonsFooter
        onAction={handleDone}
        isActionDisabled={!hasDataStreams}
        onCancel={handleCancel}
      />
      {isDeleteIntegrationModalVisible && (
        <EuiConfirmModal
          aria-labelledby={deleteIntegrationModalTitleId}
          title={i18n.DELETE_INTEGRATION_MODAL_TITLE}
          titleProps={{ id: deleteIntegrationModalTitleId }}
          onCancel={handleDeleteIntegrationModalClose}
          onConfirm={handleDeleteIntegrationConfirm}
          cancelButtonText={i18n.DELETE_INTEGRATION_MODAL_CANCEL}
          confirmButtonText={i18n.DELETE_INTEGRATION_MODAL_CONFIRM}
          defaultFocusedButton="confirm"
          buttonColor="danger"
          isLoading={deleteIntegrationMutation.isLoading}
        >
          <p>{i18n.DELETE_INTEGRATION_MODAL_BODY}</p>
        </EuiConfirmModal>
      )}
    </>
  );
};

export const IntegrationManagement = React.memo(() => {
  const services = useKibana().services;
  const { application } = services;
  const license = useObservable(services.licensing.license$);
  const hasEnterpriseLicense = useMemo(
    () =>
      Boolean(
        license?.isAvailable && license?.isActive && license?.hasAtLeast(MINIMUM_LICENSE_TYPE)
      ),
    [license]
  );

  const { integrationId } = useParams<{ integrationId?: string }>();
  const { integration, isLoading, isError } = useGetIntegrationById(integrationId);
  const { reportCancelButtonClicked } = useTelemetry();

  const integrationsHomeHref = useMemo(
    () => application.getUrlForApp(INTEGRATIONS_APP_ID),
    [application]
  );

  const handlePaywallCancel = useCallback(() => {
    reportCancelButtonClicked();
    application.navigateToUrl(integrationsHomeHref);
  }, [application, integrationsHomeHref, reportCancelButtonClicked]);

  const initialFormData = useMemo(() => {
    if (!integration) return undefined;

    return {
      integrationId: integration.integrationId,
      title: integration.title,
      description: integration.description,
      logo: integration.logo,
    };
  }, [integration]);

  const handleSubmit = useCallback(async (_data: IntegrationFormData) => {}, []);

  const existingDataStreamTitles = useMemo(
    () =>
      new Set(
        (integration?.dataStreams ?? []).map((dataStream) => normalizeTitleName(dataStream.title))
      ),
    [integration?.dataStreams]
  );

  if (!hasEnterpriseLicense) {
    return (
      <>
        <KibanaPageTemplate restrictWidth={PAGE_RESTRICT_WIDTH}>
          <KibanaPageTemplate.Header pageTitle={i18n.PAGE_TITLE_NEW_INTEGRATION} />
          <KibanaPageTemplate.Section>
            <LicensePaywallCard />
          </KibanaPageTemplate.Section>
        </KibanaPageTemplate>
        <ButtonsFooter hideActionButton onCancel={handlePaywallCancel} />
      </>
    );
  }

  // Loading state when fetching existing integration
  if (integrationId && isLoading) {
    return <EuiEmptyPrompt icon={<EuiLoadingSpinner size="xl" />} />;
  }

  if (integrationId && (isError || (!isLoading && !integration))) {
    return (
      <EuiEmptyPrompt
        iconType="warning"
        color="danger"
        title={<h2>{i18n.INTEGRATION_NOT_FOUND_TITLE}</h2>}
        body={<p>{i18n.INTEGRATION_NOT_FOUND_DESCRIPTION}</p>}
        actions={
          <EuiButton
            color="primary"
            fill
            onClick={() =>
              application.navigateToApp(INTEGRATIONS_APP_ID, {
                path: INTEGRATIONS_MANAGE_PATH,
              })
            }
          >
            {i18n.GO_BACK_BUTTON}
          </EuiButton>
        }
      />
    );
  }

  return (
    <IntegrationFormProvider
      key={integrationId ?? 'new-integration'}
      initialValue={initialFormData}
      existingDataStreamTitles={existingDataStreamTitles}
      onSubmit={handleSubmit}
    >
      <IntegrationManagementContents />
    </IntegrationFormProvider>
  );
});
IntegrationManagement.displayName = 'IntegrationManagement';
