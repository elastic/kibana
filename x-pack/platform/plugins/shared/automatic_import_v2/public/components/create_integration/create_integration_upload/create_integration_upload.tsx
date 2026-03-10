/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiCallOut,
  EuiFilePicker,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { useKibana } from '../../../common/hooks/use_kibana';
import { ButtonsFooter } from '../../../common/components/button_footer';
import {
  getIntegrationNameFromResponse,
  runInstallPackage,
  type RequestDeps,
} from '../../../common';
import { DocsLinkSubtitle } from './docs_link_subtitle';
import * as i18n from './translations';

export const CreateIntegrationUpload = React.memo(() => {
  const { http, application } = useKibana().services;
  const [file, setFile] = useState<Blob>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>();
  const [integrationName, setIntegrationName] = useState<string>();

  const createHref = useMemo(
    () => application.getUrlForApp('integrations', { path: '/create' }),
    [application]
  );

  const onBack = useCallback(() => {
    application.navigateToUrl(createHref);
  }, [application, createHref]);

  const onClose = useCallback(() => {
    application.navigateToUrl(createHref);
  }, [application, createHref]);

  const onChangeFile = useCallback((files: FileList | null) => {
    setFile(files?.[0]);
    setError(undefined);
  }, []);

  const onConfirm = useCallback(() => {
    if (http == null || file == null) {
      return;
    }
    setIsLoading(true);
    const abortController = new AbortController();
    (async () => {
      try {
        const deps: RequestDeps = { http, abortSignal: abortController.signal };
        const response = await runInstallPackage(file, deps);

        const integrationNameFromResponse = getIntegrationNameFromResponse(response);
        if (integrationNameFromResponse) {
          setIntegrationName(integrationNameFromResponse);
        } else {
          throw new Error('Integration name not found in response');
        }
      } catch (e) {
        if (!abortController.signal.aborted) {
          const errorMessage = e?.body?.message ?? e?.message ?? 'Unknown error';
          setError(`${i18n.UPLOAD_ERROR}: ${errorMessage}`);
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, [file, http]);

  return (
    <>
      <KibanaPageTemplate>
        <KibanaPageTemplate.Header
          pageTitle={i18n.UPLOAD_TITLE}
          description={<DocsLinkSubtitle />}
        />
        <KibanaPageTemplate.Section grow>
          {integrationName ? (
            <EuiCallOut
              announceOnMount
              title={i18n.SUCCESS_TITLE}
              iconType="check"
              color="success"
              data-test-subj="createIntegrationUploadSuccess"
            >
              <p>{integrationName}</p>
            </EuiCallOut>
          ) : (
            <EuiFlexGroup
              direction="row"
              alignItems="center"
              justifyContent="center"
              gutterSize="xl"
            >
              <EuiFlexItem>
                <EuiFilePicker
                  id="integrationUploadFilePicker"
                  initialPromptText={i18n.UPLOAD_INPUT_TEXT}
                  onChange={onChangeFile}
                  display="large"
                  aria-label="Upload .zip file"
                  accept="application/zip"
                  isLoading={isLoading}
                  fullWidth
                  isInvalid={error != null}
                />
                <EuiSpacer size="xs" />
                {error && (
                  <EuiText color="danger" size="xs">
                    {error}
                  </EuiText>
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
        </KibanaPageTemplate.Section>
      </KibanaPageTemplate>
      {integrationName ? (
        <ButtonsFooter
          hideCancel
          actionButtonText={i18n.CLOSE_BUTTON}
          onAction={onClose}
          isActionDisabled={false}
        />
      ) : (
        <ButtonsFooter
          cancelButtonText={i18n.BACK_BUTTON}
          actionButtonText={i18n.INSTALL_BUTTON}
          isActionDisabled={file == null}
          isActionLoading={isLoading}
          onCancel={onBack}
          onAction={onConfirm}
        />
      )}
    </>
  );
});
CreateIntegrationUpload.displayName = 'CreateIntegrationUpload';
