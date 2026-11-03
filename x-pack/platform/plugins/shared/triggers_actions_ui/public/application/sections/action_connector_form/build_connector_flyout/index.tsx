/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import {
  EuiAccordion,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { FormProvider, useForm } from 'react-hook-form';
import type { CreateConnectorTypeRequest } from '@kbn/actions-plugin/common';
import { useCreateConnectorType } from '../../../hooks/use_create_connector_type';
import { AiAssistantPanel } from './ai_assistant_panel';
import { BuildConnectorForm } from './build_connector_form';
import { YamlImportPanel } from './yaml_import_panel';
import { buildConnectorFormResolver } from './form_resolver';
import { formDataToRequest, getEmptyFormData, requestToFormData } from './form_serializers';
import type { BuildConnectorFormData } from './types';

export interface BuildConnectorFlyoutProps {
  onClose: () => void;
  onConnectorTypeCreated?: (connectorTypeId: string) => void;
}

const BuildConnectorFlyoutComponent: React.FC<BuildConnectorFlyoutProps> = ({
  onClose,
  onConnectorTypeCreated,
}) => {
  const titleId = useGeneratedHtmlId({ prefix: 'buildConnectorFlyoutTitle' });
  const yamlAccordionId = useGeneratedHtmlId({ prefix: 'buildConnectorFlyoutYaml' });
  const aiAccordionId = useGeneratedHtmlId({ prefix: 'buildConnectorFlyoutAi' });
  const methods = useForm<BuildConnectorFormData>({
    mode: 'onTouched',
    defaultValues: getEmptyFormData(),
    resolver: buildConnectorFormResolver,
  });
  const {
    handleSubmit,
    reset,
    trigger,
    formState: { errors, isSubmitting },
  } = methods;
  const {
    isLoading: isSaving,
    createConnectorType,
    createConnectorTypeError,
  } = useCreateConnectorType();

  // Issues on the definition as a whole, e.g. unknown top-level keys in an imported YAML.
  const definitionErrors = [errors.root?.message].filter((message): message is string =>
    Boolean(message)
  );

  const onApplyDefinition = useCallback(
    (connectorType: Partial<CreateConnectorTypeRequest>) => {
      reset(requestToFormData(connectorType));
      // Surface what the schema would reject right away, so the imported definition can be fixed in place.
      void trigger();
    },
    [reset, trigger]
  );

  const onSubmit = useCallback(
    async (values: BuildConnectorFormData) => {
      const result = await createConnectorType(formDataToRequest(values));
      if (!result) {
        return;
      }
      onConnectorTypeCreated?.(result.id);
      onClose();
    },
    [createConnectorType, onConnectorTypeCreated, onClose]
  );

  return (
    <EuiFlyout onClose={onClose} aria-labelledby={titleId} data-test-subj="build-connector-flyout">
      <EuiFlyoutHeader hasBorder data-test-subj="build-connector-flyout-header">
        <EuiTitle size="s">
          <h3 id={titleId}>
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.buildConnectorFlyout.title"
              defaultMessage="Build a connector"
            />
          </h3>
        </EuiTitle>
        <EuiText size="s" color="subdued">
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.buildConnectorFlyout.description"
            defaultMessage="Define a custom HTTP connector type from its configuration, authentication and actions."
          />
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiAccordion
          id={yamlAccordionId}
          buttonContent={i18n.translate(
            'xpack.triggersActionsUI.sections.buildConnectorFlyout.importYamlAccordionLabel',
            { defaultMessage: 'Import from YAML' }
          )}
          buttonProps={{ 'data-test-subj': 'build-connector-flyout-yaml-toggle' }}
          paddingSize="s"
        >
          <div data-test-subj="build-connector-flyout-yaml-panel">
            <YamlImportPanel onApply={onApplyDefinition} isDisabled={isSaving} />
          </div>
        </EuiAccordion>
        <EuiSpacer size="s" />
        <EuiAccordion
          id={aiAccordionId}
          buttonContent={i18n.translate(
            'xpack.triggersActionsUI.sections.buildConnectorFlyout.aiAccordionLabel',
            { defaultMessage: 'Generate with AI' }
          )}
          buttonProps={{ 'data-test-subj': 'build-connector-flyout-ai-toggle' }}
          paddingSize="s"
        >
          <div data-test-subj="build-connector-flyout-ai-panel">
            <AiAssistantPanel onApply={onApplyDefinition} isDisabled={isSaving} />
          </div>
        </EuiAccordion>
        <EuiSpacer size="m" />
        {definitionErrors.length > 0 && (
          <>
            <KbnDangerCallout
              announceOnMount
              size="s"
              data-test-subj="build-connector-flyout-definition-errors"
              title={i18n.translate(
                'xpack.triggersActionsUI.sections.buildConnectorFlyout.definitionErrorsTitle',
                { defaultMessage: 'Fix the following before saving' }
              )}
              text={
                <ul>
                  {definitionErrors.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              }
            />
            <EuiSpacer size="m" />
          </>
        )}
        {createConnectorTypeError && (
          <>
            <KbnDangerCallout
              announceOnMount
              size="s"
              data-test-subj="build-connector-flyout-api-error"
              title={createConnectorTypeError.title}
              text={createConnectorTypeError.message}
            />
            <EuiSpacer size="m" />
          </>
        )}
        <FormProvider {...methods}>
          <EuiForm data-test-subj="build-connector-form">
            <BuildConnectorForm />
          </EuiForm>
        </FormProvider>
      </EuiFlyoutBody>
      <EuiFlyoutFooter data-test-subj="build-connector-flyout-footer">
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={onClose}
              isDisabled={isSaving}
              data-test-subj="build-connector-flyout-close-btn"
            >
              {i18n.translate(
                'xpack.triggersActionsUI.sections.buildConnectorFlyout.closeButtonLabel',
                { defaultMessage: 'Close' }
              )}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              color="primary"
              isLoading={isSaving || isSubmitting}
              onClick={handleSubmit(onSubmit)}
              data-test-subj="build-connector-flyout-save-btn"
            >
              <FormattedMessage
                id="xpack.triggersActionsUI.sections.buildConnectorFlyout.saveButtonLabel"
                defaultMessage="Save"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

export const BuildConnectorFlyout = memo(BuildConnectorFlyoutComponent);
