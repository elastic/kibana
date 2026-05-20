/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
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
import { IntegrationFormProvider, useIntegrationForm } from './forms/integration_form';
import type { IntegrationFormData } from './forms/types';
import { PAGE_RESTRICT_WIDTH } from './constants';
import * as i18n from './translations';
import {
  useCreateUpdateIntegration,
  useDeleteIntegration,
  useGetIntegrationById,
  useKibana,
} from '../../common';
import { normalizeTitleName } from '../../common/lib/helper_functions';
import { useTelemetry } from '../telemetry_context';
import { LicensePaywallCard } from '../license_paywall/license_paywall_card';
import { AutomaticImportTelemetryEventType } from '../../../common/telemetry/types';

const INTEGRATIONS_APP_ID = 'integrations';
const INTEGRATIONS_MANAGE_PATH = '/browse?view=manage';

interface IntegrationManagementContentsProps {
  navigateToManage: () => void;
}

const IntegrationManagementContents: React.FC<IntegrationManagementContentsProps> = ({
  navigateToManage,
}) => {
  const { integrationId } = useParams<{ integrationId?: string }>();
  const { state: locationState } = useLocation<{ isNew?: boolean }>();
  const isNewlyCreated = locationState?.isNew === true;
  const { integration } = useGetIntegrationById(integrationId);
  const { deleteIntegrationMutation } = useDeleteIntegration();
  const { submit, isFormModified } = useIntegrationForm();
  const hasDataStreams = (integration?.dataStreams?.length ?? 0) > 0;
  const isDeletingDataStream =
    integration?.dataStreams?.some((ds) => ds.status === 'deleting') ?? false;
  const shouldOfferIntegrationDelete = Boolean(
    integrationId && integration && (integration.dataStreams?.length ?? 0) === 0
  );
  const [isDeleteIntegrationModalVisible, setIsDeleteIntegrationModalVisible] = useState(false);
  const deleteIntegrationModalTitleId = useGeneratedHtmlId();
  const { reportCancelButtonClicked, reportDoneButtonClicked } = useTelemetry();
  // Reanalysis updates data streams on the server but not integration form fields, so
  // useFormIsModified stays false; allow Done so the user can leave after scheduling reanalysis.
  const [reanalysisJustScheduled, setReanalysisJustScheduled] = useState(false);

  const performCancelNavigation = useCallback(() => {
    reportCancelButtonClicked({ integrationId });
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigateToManage();
    }
  }, [integrationId, navigateToManage, reportCancelButtonClicked]);

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
      navigateToManage();
    } catch {
      // Error toast is shown by useDeleteIntegration
    }
  }, [deleteIntegrationMutation, integrationId, navigateToManage]);

  const handleDone = useCallback(() => {
    reportDoneButtonClicked({ integrationId });
    submit();
  }, [integrationId, reportDoneButtonClicked, submit]);

  const handleDataStreamReanalyzeSuccess = useCallback(() => {
    setReanalysisJustScheduled(true);
  }, []);

  useEffect(() => {
    setReanalysisJustScheduled(false);
  }, [integrationId]);

  const pageTitle = integrationId
    ? i18n.PAGE_TITLE_EDIT_INTEGRATION
    : i18n.PAGE_TITLE_NEW_INTEGRATION;

  return (
    <>
      <KibanaPageTemplate restrictWidth={PAGE_RESTRICT_WIDTH}>
        <KibanaPageTemplate.Header pageTitle={pageTitle} />
        <KibanaPageTemplate.Section>
          <ConnectorSelector />
          <ManagementContents onDataStreamReanalyzeSuccess={handleDataStreamReanalyzeSuccess} />
        </KibanaPageTemplate.Section>
      </KibanaPageTemplate>
      <ButtonsFooter
        onAction={handleDone}
        isActionDisabled={
          !hasDataStreams ||
          isDeletingDataStream ||
          (Boolean(integrationId) && !isNewlyCreated && !isFormModified && !reanalysisJustScheduled)
        }
        isCancelDisabled={isDeletingDataStream}
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
  const { reportCancelButtonClicked, sessionId } = useTelemetry();
  const { telemetry } = services;

  useEffect(() => {
    if (integrationId) {
      telemetry?.reportEvent(AutomaticImportTelemetryEventType.EditIntegrationPageLoaded, {
        sessionId,
        integrationId,
      });
    } else {
      telemetry?.reportEvent(AutomaticImportTelemetryEventType.CreateIntegrationPageLoaded, {
        sessionId,
      });
    }
  }, [telemetry, sessionId, integrationId]);
  const { createUpdateIntegrationMutation } = useCreateUpdateIntegration();

  const integrationsHomeHref = useMemo(
    () => application.getUrlForApp(INTEGRATIONS_APP_ID),
    [application]
  );

  const navigateToManage = useCallback(() => {
    application.navigateToApp(INTEGRATIONS_APP_ID, { path: INTEGRATIONS_MANAGE_PATH });
  }, [application]);

  const handlePaywallCancel = useCallback(() => {
    reportCancelButtonClicked({ integrationId });
    application.navigateToUrl(integrationsHomeHref);
  }, [application, integrationId, integrationsHomeHref, reportCancelButtonClicked]);

  const initialFormData = useMemo(() => {
    if (!integration) return undefined;

    return {
      integrationId: integration.integrationId,
      title: integration.title,
      description: integration.description,
      logo: integration.logo,
      connectorId: integration.connectorId ?? '',
    };
  }, [integration]);

  const handleSubmit = useCallback(
    async (data: IntegrationFormData) => {
      const resolvedIntegrationId = integrationId ?? data.integrationId;
      if (!resolvedIntegrationId) return;

      await createUpdateIntegrationMutation.mutateAsync({
        connectorId: data.connectorId,
        integrationId: resolvedIntegrationId,
        title: data.title,
        description: data.description,
        ...(data.logo ? { logo: data.logo } : {}),
      });

      navigateToManage();
    },
    [createUpdateIntegrationMutation, integrationId, navigateToManage]
  );

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
          <EuiButton color="primary" fill onClick={navigateToManage}>
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
      <IntegrationManagementContents navigateToManage={navigateToManage} />
    </IntegrationFormProvider>
  );
});
IntegrationManagement.displayName = 'IntegrationManagement';
