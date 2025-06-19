/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState, useMemo } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiFormRow } from '@elastic/eui';
import { useFormContext } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { CasePostRequest } from '../../../common/types/api';
import { fieldName as descriptionFieldName } from '../case_form_fields/description';
import * as i18n from './translations';
import type { CasesConfigurationUI, CaseUI } from '../../containers/types';
import type { CasesTimelineIntegration } from '../timeline_context';
import { CasesTimelineIntegrationProvider } from '../timeline_context';
import { InsertTimeline } from '../insert_timeline';
import { removeItemFromSessionStorage } from '../utils';
import type { UseCreateAttachments } from '../../containers/use_create_attachments';
import { getMarkdownEditorStorageKey } from '../markdown_editor/utils';
import { SubmitCaseButton } from './submit_button';
import { FormContext } from './form_context';
import { useCasesContext } from '../cases_context/use_cases_context';
import type { CaseAttachmentsWithoutOwner } from '../../types';
import { useCancelCreationAction } from './use_cancel_creation_action';
import { CancelCreationConfirmationModal } from './cancel_creation_confirmation_modal';
import { useGetSupportedActionConnectors } from '../../containers/configure/use_get_supported_action_connectors';
import { useGetAllCaseConfigurations } from '../../containers/configure/use_get_all_case_configurations';
import type { CreateCaseFormFieldsProps } from './form_fields';
import { CreateCaseFormFields } from './form_fields';
import { getConfigurationByOwner } from '../../containers/configure/utils';
import { CreateCaseOwnerSelector } from './owner_selector';
import { useAvailableCasesOwners } from '../app/use_available_owners';
import { useActiveSolution } from '../app/use_active_solution';
import { getInitialCaseValue, getOwnerDefaultValue } from './utils';

export interface CreateCaseFormProps extends Pick<Partial<CreateCaseFormFieldsProps>, 'withSteps'> {
  onCancel: () => void;
  onSuccess: (theCase: CaseUI) => void;
  afterCaseCreated?: (
    theCase: CaseUI,
    createAttachments: UseCreateAttachments['mutate']
  ) => Promise<void>;
  timelineIntegration?: CasesTimelineIntegration;
  attachments?: CaseAttachmentsWithoutOwner;
  initialValue?: Pick<CasePostRequest, 'title' | 'description'>;
}

type FormFieldsWithFormContextProps = Pick<
  CreateCaseFormFieldsProps,
  'withSteps' | 'draftStorageKey'
> & {
  isLoadingCaseConfiguration: boolean;
  currentConfiguration: CasesConfigurationUI;
  selectedOwner: string;
  onSelectedOwner: (owner: string) => void;
};

export const FormFieldsWithFormContext: React.FC<FormFieldsWithFormContextProps> = React.memo(
  ({
    currentConfiguration,
    isLoadingCaseConfiguration,
    withSteps,
    draftStorageKey,
    selectedOwner,
    onSelectedOwner,
  }) => {
    const activeSolution = useActiveSolution();
    // Ideally I would like to use the owner from the cases context, but it doesn't work in the 3rd scenario
    // 1st scenario is when the user is in the classic view, the owner is not set in the cases context, which works fine
    // 2nd scenario is when the user is in the security solution, the owner is set to securitySolution, which works fine
    // 3rd scenario is when the user is in the observability solution, the owner is empty, which causes the owner selector to show up
    // const { owner } = useCasesContext();
    const availableOwners = useAvailableCasesOwners();

    const mapActiveSolutionToOwner = (solution: string): string => {
      switch (solution) {
        case 'oblt':
          return 'observability';
        case 'security':
          return 'securitySolution';
        default:
          return 'cases'; // default to cases if no match, in this case classis view is used
      }
    };
    // Need to check if this works on serverless as well
    const shouldShowOwnerSelector = mapActiveSolutionToOwner(activeSolution) === 'cases' && availableOwners.length > 1;

    if (!shouldShowOwnerSelector) {
      onSelectedOwner(mapActiveSolutionToOwner(activeSolution));
      // do I need to reset the form here?
      // similar to the onOwnerChange function
    }

    const { reset } = useFormContext();

    const { data: connectors = [], isLoading: isLoadingConnectors } =
      useGetSupportedActionConnectors();

    const onOwnerChange = useCallback(
      (newOwner: string) => {
        onSelectedOwner(newOwner);
        reset({
          resetValues: true,
          defaultValue: getInitialCaseValue({
            owner: newOwner,
            connector: currentConfiguration.connector,
          }),
        });
      },
      [currentConfiguration.connector, onSelectedOwner, reset]
    );

    return (
      <>
        {shouldShowOwnerSelector && (
          <CreateCaseOwnerSelector
            selectedOwner={selectedOwner}
            availableOwners={availableOwners}
            isLoading={isLoadingCaseConfiguration}
            onOwnerChange={onOwnerChange}
          />
        )}
        <CreateCaseFormFields
          connectors={connectors}
          isLoading={isLoadingConnectors || isLoadingCaseConfiguration}
          withSteps={withSteps}
          draftStorageKey={draftStorageKey}
          configuration={currentConfiguration}
        />
      </>
    );
  }
);

FormFieldsWithFormContext.displayName = 'FormFieldsWithFormContext';

export const CreateCaseForm: React.FC<CreateCaseFormProps> = React.memo(
  ({
    withSteps = true,
    afterCaseCreated,
    onCancel,
    onSuccess,
    timelineIntegration,
    attachments,
    initialValue,
  }) => {
    const { owner } = useCasesContext();
    const availableOwners = useAvailableCasesOwners();
    const defaultOwnerValue = owner[0] ?? getOwnerDefaultValue(availableOwners);
    const [selectedOwner, onSelectedOwner] = useState<string>(defaultOwnerValue);
    const { data: configurations, isLoading: isLoadingCaseConfiguration } =
      useGetAllCaseConfigurations();

    const draftStorageKey = getMarkdownEditorStorageKey({
      appId: owner[0],
      caseId: 'createCase',
      commentId: 'description',
    });

    const handleOnConfirmationCallback = (): void => {
      onCancel();
      removeItemFromSessionStorage(draftStorageKey);
    };

    const { showConfirmationModal, onOpenModal, onConfirmModal, onCancelModal } =
      useCancelCreationAction({
        onConfirmationCallback: handleOnConfirmationCallback,
      });

    const handleOnSuccess = (theCase: CaseUI): void => {
      removeItemFromSessionStorage(draftStorageKey);
      return onSuccess(theCase);
    };

    const currentConfiguration = useMemo(
      () =>
        getConfigurationByOwner({
          configurations,
          owner: selectedOwner,
        }),
      [configurations, selectedOwner]
    );

    return (
      <CasesTimelineIntegrationProvider timelineIntegration={timelineIntegration}>
        <FormContext
          afterCaseCreated={afterCaseCreated}
          onSuccess={handleOnSuccess}
          attachments={attachments}
          initialValue={initialValue}
          currentConfiguration={currentConfiguration}
          selectedOwner={selectedOwner}
        >
          <FormFieldsWithFormContext
            withSteps={withSteps}
            draftStorageKey={draftStorageKey}
            selectedOwner={selectedOwner}
            onSelectedOwner={onSelectedOwner}
            isLoadingCaseConfiguration={isLoadingCaseConfiguration}
            currentConfiguration={currentConfiguration}
          />
          <EuiFormRow fullWidth>
            <EuiFlexGroup
              alignItems="center"
              justifyContent="flexEnd"
              gutterSize="l"
              responsive={false}
            >
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  data-test-subj="create-case-cancel"
                  iconType="cross"
                  onClick={onOpenModal}
                  size="s"
                >
                  {i18n.CANCEL}
                </EuiButtonEmpty>
                {showConfirmationModal && (
                  <CancelCreationConfirmationModal
                    title={i18n.MODAL_TITLE}
                    onConfirm={onConfirmModal}
                    onCancel={onCancelModal}
                  />
                )}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <SubmitCaseButton />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFormRow>
          <InsertTimeline fieldName={descriptionFieldName} />
        </FormContext>
      </CasesTimelineIntegrationProvider>
    );
  }
);

CreateCaseForm.displayName = 'CreateCaseForm';
