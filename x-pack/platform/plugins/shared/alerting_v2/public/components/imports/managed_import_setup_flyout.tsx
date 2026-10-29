/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { PluginStart } from '@kbn/core-di';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  KbnDangerCallout,
  KbnInfoCallout,
  KbnSuccessCallout,
  KbnWarningCallout,
} from '@kbn/ui-callout';
import { useQuery, useQueryClient } from '@kbn/react-query';
import { ImportAlertsConnectorFeatureId } from '@kbn/actions-plugin/common';
import type { CreateImportResponse, ImportCredentialsResponse } from '@kbn/alerting-v2-schemas';
import type { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';
import { Controller, useForm, useWatch } from 'react-hook-form';
import type { FieldPath, RegisterOptions } from 'react-hook-form';
import { useConnectorsOfType } from '../../hooks/use_connectors_of_type';
import { useCreateImport } from '../../hooks/use_create_import';
import { importKeys } from '../../hooks/query_key_factory';
import { useRotateImportToken } from '../../hooks/use_rotate_import_token';
import { ImportsApi } from '../../services/imports_api';
import { ConnectorTypeIcon } from './connector_type_icon';
import { parseImportRequestError, validateName } from './custom_import_form';
import { ImportCredentialsPanel } from './import_credentials_panel';
import { getManagedExamplePayload } from './import_sources';
import type { ImportSource } from './import_sources';
import {
  DEFAULT_MANAGED_IMPORT_FORM_STATE,
  toCreateManagedImportData,
} from './managed_import_form';
import type { ManagedImportFormState } from './managed_import_form';
import { SendTestAlert } from './send_test_alert';
import { TagsField } from './tags_field';

const optionalLabel = (
  <EuiText size="xs" color="subdued">
    {i18n.translate('xpack.alertingV2.imports.form.optional', { defaultMessage: 'Optional' })}
  </EuiText>
);

interface ManagedImportSetupFlyoutProps {
  /** The picked connector card. */
  source: ImportSource;
  onClose: () => void;
  onBack: () => void;
  /** Called as soon as the import exists, so the list behind the flyout can refetch. */
  onCreated?: () => void;
}

export const ManagedImportSetupFlyout = ({
  source,
  onClose,
  onBack,
  onCreated,
}: ManagedImportSetupFlyoutProps) => {
  const titleId = useGeneratedHtmlId({ prefix: 'importsManagedSetupFlyoutTitle' });
  const connectorTypeId = source.id;
  const userProfile = useService(CoreStart('userProfile'));
  const importsApi = useService(ImportsApi);
  const triggersActionsUi = useService(
    PluginStart<TriggersAndActionsUIPublicPluginStart>('triggersActionsUi')
  );
  const queryClient = useQueryClient();

  const connectors = useConnectorsOfType(connectorTypeId);
  // A connector can have one import, so the ones that already have one are not offered.
  const existingImports = useQuery({
    queryKey: importKeys.lists(),
    queryFn: () => importsApi.listImports({ per_page: 100 }),
  });
  const importedConnectorIds = useMemo(
    () => new Set((existingImports.data?.items ?? []).map(({ connector_id: id }) => id)),
    [existingImports.data]
  );
  const availableConnectors = useMemo(
    () => (connectors.data ?? []).filter(({ id }) => !importedConnectorIds.has(id)),
    [connectors.data, importedConnectorIds]
  );

  const [connectorId, setConnectorId] = useState<string>('');
  const [isCreateConnectorOpen, setIsCreateConnectorOpen] = useState(false);
  const [isEditConnectorOpen, setIsEditConnectorOpen] = useState(false);
  const [created, setCreated] = useState<CreateImportResponse | null>(null);

  const {
    mutate: createImport,
    isLoading,
    error: createError,
    isError,
    reset: resetCreate,
  } = useCreateImport();

  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors, isValid, dirtyFields },
  } = useForm<ManagedImportFormState>({
    mode: 'onChange',
    defaultValues: DEFAULT_MANAGED_IMPORT_FORM_STATE,
  });

  // EUI fields take their ref as `inputRef`.
  const registerField = <TFieldName extends FieldPath<ManagedImportFormState>>(
    fieldName: TFieldName,
    options?: RegisterOptions<ManagedImportFormState, TFieldName>
  ) => {
    const { ref, ...rest } = register(fieldName, options);
    return { ...rest, inputRef: ref };
  };

  const selectedConnector = availableConnectors.find(({ id }) => id === connectorId);
  const isReceivingEvents = selectedConnector?.isInboundEventsEnabled === true;
  const isNameEdited = dirtyFields.name === true;
  const isOwnerEdited = dirtyFields.owner === true;
  const name = useWatch({ control, name: 'name' });

  // With a single connector there is nothing to choose.
  useEffect(() => {
    if (connectorId === '' && availableConnectors.length === 1) {
      setConnectorId(availableConnectors[0].id);
    }
  }, [connectorId, availableConnectors]);

  // The name follows the connector until the user edits it.
  useEffect(() => {
    if (selectedConnector && !isNameEdited) {
      setValue('name', selectedConnector.name, { shouldValidate: true });
    }
  }, [selectedConnector, isNameEdited, setValue]);

  // Owner defaults to the current user, and is only a suggestion.
  useEffect(() => {
    let cancelled = false;
    userProfile
      .getCurrent()
      .then((profile) => {
        const displayName = profile.user.full_name ?? profile.user.username;
        if (!cancelled && !isOwnerEdited && displayName) {
          setValue('owner', displayName);
        }
      })
      .catch(() => {
        // No profile, the owner stays empty.
      });
    return () => {
      cancelled = true;
    };
    // Only on mount: later edits by the user must not be overwritten.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refetchConnectors = () =>
    queryClient.invalidateQueries({ queryKey: importKeys.connectors(connectorTypeId) });

  const onSubmit = handleSubmit((values) => {
    if (connectorId === '') {
      return;
    }
    createImport(toCreateManagedImportData({ connectorId, values }), {
      onSuccess: (response) => {
        setCreated(response);
        onCreated?.();
      },
    });
  });

  const isConnectorFlyoutOpen = isCreateConnectorOpen || isEditConnectorOpen;

  // Escape reaches this flyout as well as the connector flyout opened on top of it.
  const handleClose = () => {
    if (!isLoading && !isConnectorFlyoutOpen) {
      onClose();
    }
  };

  const handleDone = () => {
    onCreated?.();
    onClose();
  };

  const requestError = isError ? parseImportRequestError(createError) : undefined;
  const connectorOptions = [
    {
      value: '',
      text: i18n.translate('xpack.alertingV2.imports.managed.connector.placeholder', {
        defaultMessage: 'Select a connector',
      }),
    },
    ...availableConnectors.map(({ id, name: connectorName }) => ({
      value: id,
      text: connectorName,
    })),
  ];

  const createConnectorFlyout = isCreateConnectorOpen
    ? triggersActionsUi.getAddConnectorFlyout({
        featureId: ImportAlertsConnectorFeatureId,
        // Receiving events is off by default for connectors that also send. An import needs it on.
        initialConnector: { actionTypeId: connectorTypeId, isInboundEventsEnabled: true },
        onClose: () => setIsCreateConnectorOpen(false),
        onConnectorCreated: (connector) => {
          setConnectorId(connector.id);
          refetchConnectors();
        },
        onConnectorUpdated: () => {
          refetchConnectors();
        },
      })
    : null;

  const editConnectorFlyout =
    isEditConnectorOpen && selectedConnector
      ? triggersActionsUi.getEditConnectorFlyout({
          connector: selectedConnector,
          onClose: () => setIsEditConnectorOpen(false),
          onConnectorUpdated: () => {
            refetchConnectors();
          },
        })
      : null;

  const isLoadingConnectors = connectors.isLoading || existingImports.isLoading;
  const typeName = source.title;

  return (
    <>
      <EuiFlyout
        onClose={handleClose}
        aria-labelledby={titleId}
        size="m"
        ownFocus
        outsideClickCloses={false}
        hideCloseButton={isLoading}
        data-test-subj="importsManagedSetupFlyout"
      >
        <EuiFlyoutHeader hasBorder>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <ConnectorTypeIcon connectorTypeId={connectorTypeId} size="l" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="m" id={titleId}>
                <h2 data-test-subj="importsManagedSetupTitle">
                  {created ? (
                    <FormattedMessage
                      id="xpack.alertingV2.imports.managed.connectTitle"
                      defaultMessage="Connect {name}"
                      values={{ name: typeName }}
                    />
                  ) : (
                    typeName
                  )}
                </h2>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
          {!created && (
            <>
              <EuiSpacer size="xs" />
              <EuiText size="s" color="subdued">
                <p>
                  <FormattedMessage
                    id="xpack.alertingV2.imports.managed.subtitle"
                    defaultMessage="Import alerts with your {name} connector. Alerts are created for you, no workflow to build."
                    values={{ name: typeName }}
                  />
                </p>
              </EuiText>
            </>
          )}
        </EuiFlyoutHeader>

        <EuiFlyoutBody>
          {created ? (
            <ConnectYourSource
              created={created}
              connectorTypeId={connectorTypeId}
              typeName={typeName}
              onTestSent={onCreated}
            />
          ) : (
            <form onSubmit={onSubmit} noValidate data-test-subj="importsManagedSetupForm">
              {requestError && (
                <>
                  <KbnDangerCallout
                    announceOnMount
                    data-test-subj="importsManagedSetupError"
                    title={i18n.translate('xpack.alertingV2.imports.setup.errorTitle', {
                      defaultMessage: 'The import could not be set up',
                    })}
                    text={requestError.message}
                  />
                  <EuiSpacer size="m" />
                </>
              )}

              <EuiTitle size="xxs">
                <h3>
                  <FormattedMessage
                    id="xpack.alertingV2.imports.managed.connectorSection"
                    defaultMessage="Connector"
                  />
                </h3>
              </EuiTitle>
              <EuiSpacer size="s" />

              {isLoadingConnectors ? (
                <EuiLoadingSpinner size="m" data-test-subj="importsManagedConnectorsLoading" />
              ) : availableConnectors.length === 0 ? (
                <KbnInfoCallout
                  size="s"
                  data-test-subj="importsManagedNoConnector"
                  title={i18n.translate('xpack.alertingV2.imports.managed.noConnector.title', {
                    defaultMessage: 'Create a {name} connector to get started',
                    values: { name: typeName },
                  })}
                  text={
                    <p>
                      <FormattedMessage
                        id="xpack.alertingV2.imports.managed.noConnector.body"
                        defaultMessage="The connector holds your {name} credentials and receives the alerts. You can keep using it for everything else it does."
                        values={{ name: typeName }}
                      />
                    </p>
                  }
                  actionProps={{
                    primary: {
                      children: i18n.translate('xpack.alertingV2.imports.managed.createConnector', {
                        defaultMessage: 'Create connector',
                      }),
                      iconType: 'plusInCircle',
                      onClick: () => setIsCreateConnectorOpen(true),
                      'data-test-subj': 'importsManagedCreateConnector',
                    },
                  }}
                />
              ) : (
                <EuiFormRow
                  fullWidth
                  label={i18n.translate('xpack.alertingV2.imports.managed.connector.label', {
                    defaultMessage: 'Use an existing connector',
                  })}
                  helpText={i18n.translate('xpack.alertingV2.imports.managed.connector.help', {
                    defaultMessage: 'Each connector can have one import.',
                  })}
                >
                  <EuiFlexGroup gutterSize="s" responsive={false}>
                    <EuiFlexItem>
                      <EuiSelect
                        fullWidth
                        options={connectorOptions}
                        value={connectorId}
                        disabled={isLoading}
                        onChange={(event) => setConnectorId(event.target.value)}
                        aria-label={i18n.translate(
                          'xpack.alertingV2.imports.managed.connector.ariaLabel',
                          { defaultMessage: 'Connector' }
                        )}
                        data-test-subj="importsManagedConnectorSelect"
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiButtonEmpty
                        iconType="plusCircle"
                        onClick={() => setIsCreateConnectorOpen(true)}
                        isDisabled={isLoading}
                        data-test-subj="importsManagedCreateConnector"
                      >
                        <FormattedMessage
                          id="xpack.alertingV2.imports.managed.createAnotherConnector"
                          defaultMessage="New connector"
                        />
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFormRow>
              )}

              {selectedConnector && !isReceivingEvents && (
                <>
                  <EuiSpacer size="m" />
                  <KbnWarningCallout
                    size="s"
                    data-test-subj="importsManagedReceiveEventsOff"
                    title={i18n.translate('xpack.alertingV2.imports.managed.receiveOff.title', {
                      defaultMessage: 'This connector is not receiving events',
                    })}
                    text={
                      <p>
                        <FormattedMessage
                          id="xpack.alertingV2.imports.managed.receiveOff.body"
                          defaultMessage="Edit the connector and turn on Receive events. Without it, nothing that {name} sends reaches Kibana."
                          values={{ name: typeName }}
                        />
                      </p>
                    }
                    actionProps={{
                      primary: {
                        children: i18n.translate('xpack.alertingV2.imports.managed.editConnector', {
                          defaultMessage: 'Edit connector',
                        }),
                        iconType: 'pencil',
                        onClick: () => setIsEditConnectorOpen(true),
                        'data-test-subj': 'importsManagedEditConnector',
                      },
                    }}
                  />
                </>
              )}

              {selectedConnector && (
                <>
                  <EuiSpacer size="l" />
                  <EuiTitle size="xxs">
                    <h3>
                      <FormattedMessage
                        id="xpack.alertingV2.imports.managed.detailsSection"
                        defaultMessage="Import details"
                      />
                    </h3>
                  </EuiTitle>
                  <EuiSpacer size="s" />

                  <EuiFormRow
                    fullWidth
                    label={i18n.translate('xpack.alertingV2.imports.form.name.label', {
                      defaultMessage: 'Name',
                    })}
                    isInvalid={errors.name !== undefined}
                    error={errors.name?.message}
                  >
                    <EuiFieldText
                      fullWidth
                      isInvalid={errors.name !== undefined}
                      disabled={isLoading}
                      data-test-subj="importsManagedFormName"
                      {...registerField('name', { validate: validateName })}
                    />
                  </EuiFormRow>

                  <EuiFormRow
                    fullWidth
                    label={i18n.translate('xpack.alertingV2.imports.form.description.label', {
                      defaultMessage: 'Description',
                    })}
                    labelAppend={optionalLabel}
                  >
                    <EuiTextArea
                      fullWidth
                      rows={2}
                      disabled={isLoading}
                      data-test-subj="importsManagedFormDescription"
                      {...registerField('description')}
                    />
                  </EuiFormRow>

                  <EuiFormRow
                    fullWidth
                    label={i18n.translate('xpack.alertingV2.imports.form.tags.label', {
                      defaultMessage: 'Tags',
                    })}
                    labelAppend={optionalLabel}
                  >
                    <Controller
                      control={control}
                      name="tags"
                      render={({ field }) => (
                        <TagsField
                          value={field.value}
                          onChange={field.onChange}
                          aria-label={i18n.translate(
                            'xpack.alertingV2.imports.form.tags.ariaLabel',
                            { defaultMessage: 'Tags' }
                          )}
                          data-test-subj="importsManagedFormTags"
                        />
                      )}
                    />
                  </EuiFormRow>

                  <EuiFormRow
                    fullWidth
                    label={i18n.translate('xpack.alertingV2.imports.form.routingTags.label', {
                      defaultMessage: 'Routing tags',
                    })}
                    labelAppend={optionalLabel}
                    helpText={i18n.translate('xpack.alertingV2.imports.form.routingTags.help', {
                      defaultMessage: 'Stored now, used by action policies later.',
                    })}
                  >
                    <Controller
                      control={control}
                      name="routingTags"
                      render={({ field }) => (
                        <TagsField
                          value={field.value}
                          onChange={field.onChange}
                          aria-label={i18n.translate(
                            'xpack.alertingV2.imports.form.routingTags.ariaLabel',
                            { defaultMessage: 'Routing tags' }
                          )}
                          data-test-subj="importsManagedFormRoutingTags"
                        />
                      )}
                    />
                  </EuiFormRow>

                  <EuiFormRow
                    fullWidth
                    label={i18n.translate('xpack.alertingV2.imports.form.owner.label', {
                      defaultMessage: 'Owner',
                    })}
                    labelAppend={optionalLabel}
                  >
                    <EuiFieldText
                      fullWidth
                      disabled={isLoading}
                      data-test-subj="importsManagedFormOwner"
                      {...registerField('owner')}
                    />
                  </EuiFormRow>
                </>
              )}
            </form>
          )}
        </EuiFlyoutBody>

        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
            {created ? (
              <EuiFlexItem grow={false}>
                <EuiButton fill onClick={handleDone} data-test-subj="importsManagedSetupDone">
                  <FormattedMessage
                    id="xpack.alertingV2.imports.setup.done"
                    defaultMessage="Done"
                  />
                </EuiButton>
              </EuiFlexItem>
            ) : (
              <>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    iconType="chevronSingleLeft"
                    onClick={onBack}
                    isDisabled={isLoading}
                    data-test-subj="importsManagedSetupBack"
                  >
                    <FormattedMessage
                      id="xpack.alertingV2.imports.setup.back"
                      defaultMessage="Back"
                    />
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    fill
                    onClick={() => {
                      resetCreate();
                      onSubmit();
                    }}
                    isLoading={isLoading}
                    isDisabled={!selectedConnector || !isReceivingEvents || !isValid || name === ''}
                    data-test-subj="importsManagedSetupSubmit"
                  >
                    <FormattedMessage
                      id="xpack.alertingV2.imports.setup.create"
                      defaultMessage="Create import"
                    />
                  </EuiButton>
                </EuiFlexItem>
              </>
            )}
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
      {createConnectorFlyout}
      {editConnectorFlyout}
    </>
  );
};

const ConnectYourSource = ({
  created,
  connectorTypeId,
  typeName,
  onTestSent,
}: {
  created: CreateImportResponse;
  connectorTypeId: string;
  typeName: string;
  onTestSent?: () => void;
}) => {
  const { mutate: rotateToken, isLoading: isRotating } = useRotateImportToken();
  const [rotated, setRotated] = useState<ImportCredentialsResponse | null>(null);
  const token = created.credentials?.token ?? rotated?.credentials.token;

  return (
    <div data-test-subj="importsManagedSetupConnect">
      <KbnSuccessCallout
        announceOnMount
        size="s"
        data-test-subj="importsManagedSetupSuccess"
        title={i18n.translate('xpack.alertingV2.imports.setup.successTitle', {
          defaultMessage: '{name} is ready to receive alerts',
          values: { name: created.import.name },
        })}
      />
      <EuiSpacer size="m" />
      <ImportCredentialsPanel
        url={created.url}
        token={token}
        publicBaseUrlConfigured={created.public_base_url_configured}
        examplePayload={getManagedExamplePayload(connectorTypeId)}
        hint={
          <p>
            <FormattedMessage
              id="xpack.alertingV2.imports.managed.hint"
              defaultMessage="Paste this URL into the webhook integration in {name}, and send the token as an Authorization header."
              values={{ name: typeName }}
            />
          </p>
        }
        rotateAction={
          <>
            <EuiText size="s" color="subdued">
              <p>
                <FormattedMessage
                  id="xpack.alertingV2.imports.managed.rotate.body"
                  defaultMessage="The token is shown once, when it is created. To see a new one, rotate it. The current token stops working, so update {name} afterwards."
                  values={{ name: typeName }}
                />
              </p>
            </EuiText>
            <EuiSpacer size="s" />
            <EuiButton
              size="s"
              iconType="refresh"
              isLoading={isRotating}
              onClick={() =>
                rotateToken(created.import.id, { onSuccess: (response) => setRotated(response) })
              }
              data-test-subj="importsManagedRotateToken"
            >
              <FormattedMessage
                id="xpack.alertingV2.imports.managed.rotate.button"
                defaultMessage="Rotate token"
              />
            </EuiButton>
          </>
        }
      />
      <EuiSpacer size="l" />
      <EuiTitle size="xxs">
        <h3>
          <FormattedMessage
            id="xpack.alertingV2.imports.setup.testTitle"
            defaultMessage="Try it out"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <EuiText size="s" color="subdued">
        <p>
          <FormattedMessage
            id="xpack.alertingV2.imports.setup.testBody"
            defaultMessage="Send a sample payload through the workflow to check the setup end to end."
          />
        </p>
      </EuiText>
      <EuiSpacer size="s" />
      <SendTestAlert importId={created.import.id} onSent={onTestSent} />
    </div>
  );
};
