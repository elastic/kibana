/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiPanel,
  EuiSpacer,
} from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import type Oas from 'oas';
import { getAuthDetails, reduceSpecComponents } from '../../../../../../../util/oas';
import type { CelAuthType, CelInputRequestBody, CelInput } from '../../../../../../../../common';
import { runCelGraph, getLangSmithOptions, useKibana } from '../../../../../../../common';
import { useActions, type State } from '../../../../state';
import * as i18n from './translations';
import { EndpointSelection } from './endpoint_selection';
import { AuthSelection } from './auth_selection';
import { GenerationError } from '../../generation_error';
import { useTelemetry } from '../../../../../telemetry';
import type { IntegrationSettings } from '../../../../types';

export const translateDisplayAuthToType = (auth: string): string => {
  return auth === 'API Token' ? 'Header' : auth;
};

const translateAuthTypeToDisplay = (auth: string): string => {
  return auth === 'Header' ? 'API Token' : auth;
};

const getSpecifiedAuthForPath = (apiSpec: Oas | undefined, path: string) => {
  const authMethods = apiSpec?.operation(path, 'get').prepareSecurity();
  const specifiedAuth = authMethods ? Object.keys(authMethods) : [];
  return specifiedAuth;
};

const loadPaths = (integrationSettings: IntegrationSettings | undefined): string[] => {
  const pathObjs = integrationSettings?.apiSpec?.getPaths();
  if (!pathObjs) {
    return [];
  }
  return Object.keys(pathObjs).filter((path) => pathObjs[path].get);
};

interface ConfirmSettingsStepProps {
  integrationSettings: State['integrationSettings'];
  connector: State['connector'];
  isFlyoutGenerating: State['isFlyoutGenerating'];
  suggestedPaths: string[];
  showValidation: boolean;
  onShowValidation: () => void;
  onUpdateValidation: (updatedIsValid: boolean) => void;
  onUpdateNeedsGeneration: (updatedNeedsGeneration: boolean) => void;
  onCelInputGenerationComplete: (path: string, auth: CelAuthType, celInputResult: CelInput) => void;
}

export const ConfirmSettingsStep = React.memo<ConfirmSettingsStepProps>(
  ({
    integrationSettings,
    connector,
    isFlyoutGenerating,
    suggestedPaths,
    showValidation,
    onShowValidation,
    onUpdateValidation,
    onUpdateNeedsGeneration,
    onCelInputGenerationComplete,
  }) => {
    const { setIsFlyoutGenerating } = useActions();
    const { http, notifications } = useKibana().services;
    const { reportCelGenerationComplete } = useTelemetry();

    const [selectedPath, setSelectedPath] = useState<string>(() =>
      suggestedPaths ? suggestedPaths[0] : ''
    );
    const [selectedOtherPath, setSelectedOtherPath] = useState<string | undefined>();
    const [useOtherPath, setUseOtherPath] = useState<boolean>(false);
    const coalescedSelectedPath = !useOtherPath ? selectedPath : selectedOtherPath;

    const [selectedAuth, setSelectedAuth] = useState<string | undefined>(() => {
      const recommendedPath = suggestedPaths ? suggestedPaths[0] : '';
      if (recommendedPath) {
        const specifiedAuth = getSpecifiedAuthForPath(
          integrationSettings?.apiSpec,
          recommendedPath
        );
        return translateAuthTypeToDisplay(specifiedAuth[0]);
      }
    });

    const [specifiedAuthForPath, setSpecifiedAuthForPath] = useState<string[]>([]);
    const [unspecifiedAuth, setUnspecifiedAuth] = useState<boolean>(false);

    const [successfulGeneration, setSuccessfulGeneration] = useState<boolean>(false);
    const [generatedPair, setGeneratedPair] = useState<{
      path: string | undefined;
      auth: CelAuthType | undefined;
    }>({ path: undefined, auth: undefined });
    const [error, setError] = useState<null | string>(null);

    const [fieldValidationErrors, setFieldValidationErrors] = useState({
      path: false,
      auth: false,
    });

    const isSelectedPathGenerated =
      generatedPair.path === coalescedSelectedPath &&
      generatedPair.auth ===
        (selectedAuth && translateDisplayAuthToType(selectedAuth).toLowerCase());

    // updates the specified auth methods when the selected path is modified
    useEffect(() => {
      const path = coalescedSelectedPath;
      if (path) {
        const specifiedAuth = getSpecifiedAuthForPath(integrationSettings?.apiSpec, path);
        setSpecifiedAuthForPath(specifiedAuth);
      }
    }, [coalescedSelectedPath, integrationSettings?.apiSpec]);

    useEffect(() => {
      onUpdateValidation(!fieldValidationErrors.path && !fieldValidationErrors.auth);
    }, [fieldValidationErrors, onUpdateValidation]);

    const onChangeSuggestedPath = useCallback(
      (path: string) => {
        setSelectedPath(path);
        setUseOtherPath(path === i18n.ENTER_MANUALLY);
        if (path !== i18n.ENTER_MANUALLY) {
          setSelectedOtherPath(undefined);
        }
      },
      [setSelectedPath, setUseOtherPath]
    );

    const onChangeOtherPath = useCallback(
      (field: EuiComboBoxOptionOption[]) => {
        const path = field?.[0]?.label;
        setSelectedOtherPath(path);
        setFieldValidationErrors((current) => ({ ...current, path: path === undefined }));
      },
      [setSelectedOtherPath]
    );

    const onChangeAuth = useCallback(
      (field: EuiComboBoxOptionOption[]) => {
        const auth = field && field.length ? field[0].label : undefined;
        setSelectedAuth(auth);

        if (auth) {
          const translatedAuth = translateDisplayAuthToType(auth);
          if (specifiedAuthForPath) {
            setUnspecifiedAuth(!specifiedAuthForPath.includes(translatedAuth));
          }
          setFieldValidationErrors((current) => ({ ...current, auth: false }));
        } else {
          setUnspecifiedAuth(false);
          setFieldValidationErrors((current) => ({ ...current, auth: true }));
        }
      },
      [specifiedAuthForPath]
    );

    const onGenerate = useCallback(() => {
      if (fieldValidationErrors.path || fieldValidationErrors.auth) {
        onShowValidation();
        return;
      }

      if (
        http == null ||
        connector == null ||
        integrationSettings == null ||
        notifications?.toasts == null ||
        coalescedSelectedPath == null ||
        selectedAuth == null
      ) {
        return;
      }

      setError(null);
      onUpdateNeedsGeneration(false);

      const generationStartedAt = Date.now();
      const abortController = new AbortController();
      const deps = { http, abortSignal: abortController.signal };

      (async () => {
        try {
          setIsFlyoutGenerating(true);

          const oas = integrationSettings.apiSpec;
          if (!oas) {
            throw new Error('Missing OpenAPI spec');
          }

          const path = coalescedSelectedPath;
          const auth = translateDisplayAuthToType(selectedAuth).toLowerCase() as CelAuthType;

          if (!path || !auth) {
            throw new Error('Missing path and auth selections');
          }

          const endpointOperation = oas?.operation(path, 'get');
          if (!endpointOperation) {
            throw new Error('Selected path is not found in OpenApi specification');
          }

          const authOptions = endpointOperation?.prepareSecurity();
          const endpointAuth = getAuthDetails(auth, authOptions);

          const schemas = reduceSpecComponents(oas, path);

          const celRequest: CelInputRequestBody = {
            dataStreamTitle: integrationSettings.dataStreamTitle ?? '',
            celDetails: {
              path,
              auth,
              openApiDetails: {
                operation: JSON.stringify(endpointOperation.schema),
                auth: JSON.stringify(endpointAuth),
                schemas: JSON.stringify(schemas ?? {}),
              },
            },
            connectorId: connector.id,
            langSmithOptions: getLangSmithOptions(),
          };
          const celGraphResult = await runCelGraph(celRequest, deps);

          if (abortController.signal.aborted) return;

          if (isEmpty(celGraphResult?.results)) {
            throw new Error('Results not found in response');
          }

          reportCelGenerationComplete({
            connector,
            integrationSettings,
            durationMs: Date.now() - generationStartedAt,
          });

          const result = {
            authType: auth,
            program: celGraphResult.results.program,
            needsAuthConfigBlock: celGraphResult?.results.needsAuthConfigBlock,
            stateSettings: celGraphResult.results.stateSettings,
            configFields: celGraphResult.results.configFields,
            redactVars: celGraphResult.results.redactVars,
            url: oas.url(),
          };

          onCelInputGenerationComplete(path, auth, result);
          setSuccessfulGeneration(true);
          setGeneratedPair({ path, auth });
        } catch (e) {
          if (abortController.signal.aborted) return;
          const errorMessage = `${e.message}${
            e.body ? ` (${e.body.statusCode}): ${e.body.message}` : ''
          }`;

          reportCelGenerationComplete({
            connector,
            integrationSettings,
            durationMs: Date.now() - generationStartedAt,
            error: errorMessage,
          });

          setError(errorMessage);
        } finally {
          setIsFlyoutGenerating(false);
        }
      })();
      return () => {
        abortController.abort();
      };
    }, [
      fieldValidationErrors.path,
      fieldValidationErrors.auth,
      http,
      connector,
      integrationSettings,
      notifications?.toasts,
      coalescedSelectedPath,
      selectedAuth,
      onUpdateNeedsGeneration,
      onShowValidation,
      setIsFlyoutGenerating,
      reportCelGenerationComplete,
      onCelInputGenerationComplete,
    ]);

    const onCancel = useCallback(() => {
      setIsFlyoutGenerating(false); // aborts generation
      onUpdateNeedsGeneration(true);
    }, [onUpdateNeedsGeneration, setIsFlyoutGenerating]);

    return (
      <EuiFlexGroup direction="column" gutterSize="l" data-test-subj="confirmSettingsStep">
        <EuiPanel hasShadow={false} hasBorder={false}>
          <EndpointSelection
            allPaths={loadPaths(integrationSettings)}
            pathSuggestions={suggestedPaths}
            selectedPath={selectedPath}
            selectedOtherPath={selectedOtherPath}
            useOtherEndpoint={useOtherPath}
            isGenerating={isFlyoutGenerating}
            showValidation={showValidation}
            onChangeSuggestedPath={onChangeSuggestedPath}
            onChangeOtherPath={onChangeOtherPath}
          />
          <EuiSpacer size="m" />
          <AuthSelection
            selectedAuth={selectedAuth}
            specifiedAuthForPath={specifiedAuthForPath}
            invalidAuth={unspecifiedAuth}
            showValidation={showValidation}
            isGenerating={isFlyoutGenerating}
            onChangeAuth={onChangeAuth}
          />
          <EuiSpacer size="m" />
          {successfulGeneration && isSelectedPathGenerated ? (
            <EuiCallOut
              title={i18n.SUCCESS}
              color="success"
              iconType="check"
              data-test-subj="successCallout"
            />
          ) : error ? (
            <GenerationError title={i18n.GENERATION_ERROR} error={error} retryAction={onGenerate} />
          ) : (
            <EuiFlexGroup justifyContent="flexStart">
              <EuiButton
                fill
                fullWidth={false}
                isDisabled={
                  isFlyoutGenerating ||
                  (showValidation && (fieldValidationErrors.path || fieldValidationErrors.auth))
                }
                isLoading={isFlyoutGenerating}
                iconSide="right"
                color="primary"
                onClick={onGenerate}
                data-test-subj="generateCelInputButton"
              >
                {isFlyoutGenerating ? i18n.GENERATING : i18n.GENERATE}
              </EuiButton>
              {isFlyoutGenerating && (
                <EuiButtonEmpty
                  onClick={onCancel}
                  flush="left"
                  data-test-subj="cancelCelGenerationButton"
                >
                  {i18n.CANCEL}
                </EuiButtonEmpty>
              )}
            </EuiFlexGroup>
          )}
        </EuiPanel>
      </EuiFlexGroup>
    );
  }
);
ConfirmSettingsStep.displayName = 'ConfirmSettingsStep';
