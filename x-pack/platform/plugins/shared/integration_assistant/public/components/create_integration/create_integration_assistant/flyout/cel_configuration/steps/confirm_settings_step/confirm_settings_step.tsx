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
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import type { CelAuthType, CelInput } from '../../../../../../../../common';
import { useActions, type State } from '../../../../state';
import * as i18n from './translations';
import { EndpointSelection } from './endpoint_selection';
import type { IntegrationSettings } from '../../../../types';
import { AuthSelection } from './auth_selection';
import { useTelemetry } from '../../../../../telemetry';
import { getAuthDetails, reduceSpecComponents } from '../../../../../../../util/oas';
import { useKibana } from '../../../../../../../common/hooks/use_kibana';
import { type CelInputRequestBody } from '../../../../../../../../common';
import { getLangSmithOptions } from '../../../../../../../common/lib/lang_smith';
import { runCelGraph } from '../../../../../../../common/lib/api';

export const translateDisplayAuthToType = (auth: string): string => {
  return auth === 'API Token' ? 'Header' : auth;
};

const translateAuthTypeToDisplay = (auth: string): string => {
  return auth === 'Header' ? 'API Token' : auth;
};

const getSpecifiedAuthForPath = (
  integrationSettings: IntegrationSettings | undefined,
  path: string
) => {
  const authMethods = integrationSettings?.apiSpec?.operation(path, 'get').prepareSecurity();
  const specifiedAuth = authMethods ? Object.keys(authMethods) : [];
  return specifiedAuth;
};

interface ConfirmSettingsStepProps {
  integrationSettings: State['integrationSettings'];
  connector: State['connector'];
  isFlyoutGenerating: State['isFlyoutGenerating'];
  suggestedPaths: string[];
  onCelInputGenerationComplete: (path: string, auth: CelAuthType, celInputResult: CelInput) => void;
}

export const ConfirmSettingsStep = React.memo<ConfirmSettingsStepProps>(
  ({
    integrationSettings,
    connector,
    isFlyoutGenerating,
    suggestedPaths,
    onCelInputGenerationComplete,
  }) => {
    const { setIsFlyoutGenerating } = useActions();
    const { http, notifications } = useKibana().services;
    const { reportCelGenerationComplete } = useTelemetry();

    const [selectedPath, setSelectedPath] = useState<string>();
    const [selectedOtherPath, setSelectedOtherPath] = useState<string | undefined>();
    const [useOtherPath, setUseOtherPath] = useState<boolean>(false);
    const coalescedSelectedPath = !useOtherPath ? selectedPath : selectedOtherPath;

    const [selectedAuth, setSelectedAuth] = useState<string | undefined>();

    const [specifiedAuthForPath, setSpecifiedAuthForPath] = useState<string[]>([]);
    const [invalidAuth, setInvalidAuth] = useState<boolean>(false);

    const [successfulGeneration, setSuccessfulGeneration] = useState<boolean>(false);
    const [generatedPair, setGeneratedPair] = useState<{
      path: string | undefined;
      auth: CelAuthType | undefined;
    }>({ path: undefined, auth: undefined });
    const [error, setError] = useState<null | string>(null);

    const isSelectedPathGenerated =
      generatedPair.path === coalescedSelectedPath &&
      generatedPair.auth ===
        (selectedAuth && translateDisplayAuthToType(selectedAuth).toLowerCase());

    console.log('pair', generatedPair);
    console.log('is', isSelectedPathGenerated);
    console.log('path', coalescedSelectedPath);
    console.log('auth', selectedAuth);
    console.log('trans auth', translateDisplayAuthToType(selectedAuth ?? ''));

    // sets the recommended options on load
    useEffect(() => {
      const path = suggestedPaths ? suggestedPaths[0] : '';
      setSelectedPath(suggestedPaths ? suggestedPaths[0] : '');
      if (path) {
        const specifiedAuth = getSpecifiedAuthForPath(integrationSettings, path);
        setSelectedAuth(translateAuthTypeToDisplay(specifiedAuth[0]));
      }
    }, [integrationSettings, integrationSettings?.apiSpec, suggestedPaths]);

    // updates the specified auth methods when the selected path is modified
    useEffect(() => {
      const path = coalescedSelectedPath;
      if (path) {
        const authMethods = integrationSettings?.apiSpec?.operation(path, 'get').prepareSecurity();
        const specifiedAuth = authMethods ? Object.keys(authMethods) : [];
        setSpecifiedAuthForPath(specifiedAuth);
      }
    }, [coalescedSelectedPath, integrationSettings?.apiSpec, useOtherPath]);

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
        const path = field && field.length ? field[0].label : undefined;
        setSelectedOtherPath(path);
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
            setInvalidAuth(!specifiedAuthForPath.includes(translatedAuth));
          }
        } else {
          setInvalidAuth(false);
        }
      },
      [specifiedAuthForPath]
    );

    const onGenerate = useCallback(() => {
      if (
        http == null ||
        connector == null ||
        integrationSettings == null ||
        notifications?.toasts == null ||
        (selectedPath == null && selectedOtherPath == null) ||
        selectedAuth == null
      ) {
        return;
      }
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

          const path = !useOtherPath ? selectedPath : selectedOtherPath;
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
      http,
      connector,
      integrationSettings,
      notifications?.toasts,
      selectedPath,
      selectedOtherPath,
      selectedAuth,
      setIsFlyoutGenerating,
      useOtherPath,
      reportCelGenerationComplete,
      onCelInputGenerationComplete,
    ]);

    const onCancel = useCallback(() => {
      setIsFlyoutGenerating(false); // aborts generation
    }, [setIsFlyoutGenerating]);

    return (
      <EuiFlexGroup direction="column" gutterSize="l" data-test-subj="confirmSettingsStep">
        <EuiPanel hasShadow={false} hasBorder={false}>
          <EuiText size="s">{i18n.CONFIRM_DESCRIPTION}</EuiText>
          <EuiSpacer size="m" />
          <EndpointSelection
            integrationSettings={integrationSettings}
            pathSuggestions={suggestedPaths}
            selectedPath={selectedPath}
            selectedOtherPath={selectedOtherPath}
            useOtherEndpoint={useOtherPath}
            isGenerating={isFlyoutGenerating}
            onChangeSuggestedPath={onChangeSuggestedPath}
            onChangeOtherPath={onChangeOtherPath}
          />
          <EuiSpacer size="m" />
          <AuthSelection
            selectedAuth={selectedAuth}
            specifiedAuthForPath={specifiedAuthForPath}
            invalidAuth={invalidAuth}
            isGenerating={isFlyoutGenerating}
            onChangeAuth={onChangeAuth}
          />
          <EuiSpacer size="m" />
          {successfulGeneration && isSelectedPathGenerated ? (
            <EuiCallOut title="Success" color="success" iconType="check" />
          ) : (
            <EuiFlexGroup justifyContent="flexStart">
              <EuiButton
                fill
                fullWidth={false}
                isDisabled={isFlyoutGenerating}
                isLoading={isFlyoutGenerating}
                iconSide="right"
                color="primary"
                onClick={onGenerate}
                data-test-subj="generateCelInputButton"
              >
                {isFlyoutGenerating ? i18n.GENERATING : i18n.GENERATE}
              </EuiButton>
              <EuiButtonEmpty
                onClick={onCancel}
                flush="left"
                data-test-subj="buttonsFooter-cancelButton"
              >
                {i18n.CANCEL}
              </EuiButtonEmpty>
            </EuiFlexGroup>
          )}
          {error && (
            <EuiFlexItem>
              <EuiSpacer size="s" />
              <EuiCallOut
                title={i18n.GENERATION_ERROR}
                color="danger"
                iconType="alert"
                data-test-subj="celGenerationErrorCallout"
              >
                {error}
              </EuiCallOut>
            </EuiFlexItem>
          )}
        </EuiPanel>
      </EuiFlexGroup>
    );
  }
);
ConfirmSettingsStep.displayName = 'ConfirmSettingsStep';
