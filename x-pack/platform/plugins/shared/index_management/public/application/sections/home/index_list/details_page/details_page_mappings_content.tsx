/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiButton,
  EuiCallOut,
  EuiCodeBlock,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiNotificationBadge,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
  useEuiBreakpoint,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { FunctionComponent } from 'react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ILicense } from '@kbn/licensing-types';
import { useUnsavedChangesPrompt } from '@kbn/unsaved-changes-prompt';
import {
  getStateWithCopyToFields,
  hasSemanticTextField,
  isSemanticTextField,
} from '../../../../components/mappings_editor/lib/utils';
import type { Index } from '../../../../../../common';
import { useDetailsPageMappingsModelManagement } from '../../../../../hooks/use_details_page_mappings_model_management';
import { useAppContext } from '../../../../app_context';
import { DocumentFields } from '../../../../components/mappings_editor/components';
import { DocumentFieldsSearch } from '../../../../components/mappings_editor/components/document_fields/document_fields_search';
import { FieldsList } from '../../../../components/mappings_editor/components/document_fields/fields';
import { SearchResult } from '../../../../components/mappings_editor/components/document_fields/search_fields';
import { MultipleMappingsWarning } from '../../../../components/mappings_editor/components/multiple_mappings_warning';
import { deNormalize, searchFields } from '../../../../components/mappings_editor/lib';
import type { MappingsEditorParsedMetadata } from '../../../../components/mappings_editor/mappings_editor';
import {
  useDispatch,
  useMappingsState,
} from '../../../../components/mappings_editor/mappings_state_context';
import {
  getFieldsFromState,
  getFieldsMatchingFilterFromState,
} from '../../../../components/mappings_editor/lib';
import type { NormalizedFields, State } from '../../../../components/mappings_editor/types';
import { MappingsFilter } from './details_page_filter_fields';

import { useMappingsStateListener } from '../../../../components/mappings_editor/use_state_listener';
import { updateIndexMappings, useUserPrivileges } from '../../../../services/api';
import { notificationService } from '../../../../services/notification';
import { SemanticTextBanner } from './semantic_text_banner';
import { TrainedModelsDeploymentModal } from './trained_models_deployment_modal';
import { parseMappings } from '../../../../shared/parse_mappings';
import { EmptyMappingsContent } from './details_page_empty_mappings';
import { AddFieldButton } from './details_page_mappings_content/add_field_button';
import { MappingsInformationPanels } from './details_page_mappings_content/mappings_information_panels';
const isInferencePreconfigured = (inferenceId: string) => inferenceId.startsWith('.');

export const DetailsPageMappingsContent: FunctionComponent<{
  index: Index;
  data: string;
  showAboutMappings: boolean;
  jsonData: any;
  refetchMapping: () => void;
}> = ({ index, data, jsonData, refetchMapping, showAboutMappings }) => {
  const {
    core: {
      application: { capabilities, navigateToUrl },
      http,
    },
    plugins: { ml, licensing },
    config,
    overlays,
    history,
  } = useAppContext();
  const { data: userPrivilege } = useUserPrivileges(index.name);
  const hasUpdateMappingsPrivilege = userPrivilege?.privileges?.canManageIndex === true;

  const pendingFieldsRef = useRef<HTMLDivElement>(null);
  const state = useMappingsState();
  const dispatch = useDispatch();
  const { fetchInferenceToModelIdMap } = useDetailsPageMappingsModelManagement();

  const [isPlatinumLicense, setIsPlatinumLicense] = useState<boolean>(false);
  const [errorsInTrainedModelDeployment, setErrorsInTrainedModelDeployment] = useState<
    Record<string, string | undefined>
  >({});
  const [hasSavedFields, setHasSavedFields] = useState<boolean>(false);
  const [isAddingFields, setAddingFields] = useState<boolean>(false);
  const [previousState, setPreviousState] = useState<State>(state);
  const [saveMappingError, setSaveMappingError] = useState<string | undefined>(undefined);
  const [isJSONVisible, setIsJSONVisible] = useState<boolean>(false);
  const [isUpdatingMappings, setIsUpdatingMappings] = useState<boolean>(false);

  const { enableSemanticText: isSemanticTextEnabled } = config;
  const hasMLPermissions = capabilities?.ml?.canGetTrainedModels ? true : false;
  const semanticTextInfo = {
    isSemanticTextEnabled: isSemanticTextEnabled && hasMLPermissions && isPlatinumLicense,
    indexName: index.name,
    ml,
    setErrorsInTrainedModelDeployment,
  };
  const hasMappings = state.mappingViewFields.rootLevelFields.length > 0;
  const indexName = index.name;
  const pendingFieldListId = useGeneratedHtmlId({
    prefix: 'pendingFieldListId',
  });
  const hasSemanticText = hasSemanticTextField(state.fields);
  const searchTerm = isAddingFields ? previousState.search.term.trim() : state.search.term.trim();

  const newFieldsLength = useMemo(() => {
    return Object.keys(state.fields.byId).length;
  }, [state.fields.byId]);

  const previousStateSelectedDataTypes: string[] = useMemo(() => {
    return previousState.filter.selectedOptions
      .filter((option) => option.checked === 'on')
      .map((option) => option.label);
  }, [previousState.filter.selectedOptions]);

  const { parsedDefaultValue, multipleMappingsDeclared } = useMemo<MappingsEditorParsedMetadata>(
    () => parseMappings(jsonData),
    [jsonData]
  );

  useUnsavedChangesPrompt({
    titleText: i18n.translate('xpack.idxMgmt.indexDetails.mappings.unsavedChangesPromptTitle', {
      defaultMessage: 'Exit without saving changes?',
    }),
    messageText: i18n.translate('xpack.idxMgmt.indexDetails.mappings.unsavedChangesPromptMessage', {
      defaultMessage:
        'Your changes will be lost if you leave this page without saving the mapping.',
    }),
    hasUnsavedChanges: isAddingFields,
    openConfirm: overlays.openConfirm,
    history,
    http,
    navigateToUrl,
  });

  useMappingsStateListener({ value: parsedDefaultValue, status: 'disabled' });

  const onToggleChange = () => {
    setIsJSONVisible(!isJSONVisible);
  };

  const onCancelAddingNewFields = useCallback(() => {
    setAddingFields(!isAddingFields);

    //  reset mappings to previous state
    dispatch({
      type: 'editor.replaceMappings',
      value: {
        ...previousState,
        documentFields: {
          status: 'disabled',
          editor: 'default',
        },
      },
    });
  }, [isAddingFields, dispatch, previousState]);

  const addFieldButtonOnClick = useCallback(() => {
    setAddingFields(!isAddingFields);

    // when adding new field, save previous state. This state is then used by FieldsList component to show only saved mappings.
    setPreviousState(state);

    // reset mappings and change status to create field.
    dispatch({
      type: 'editor.replaceMappings',
      value: {
        ...state,
        fields: { ...state.fields, byId: {}, rootLevelFields: [] } as NormalizedFields,
        filter: {
          filteredFields: [],
          selectedOptions: [],
          selectedDataTypes: [],
        },
        documentFields: {
          status: 'creatingField',
          editor: 'default',
        },
      },
    });
  }, [dispatch, isAddingFields, state]);

  const updateMappings = useCallback(
    async (forceSaveMappings?: boolean) => {
      let inferenceToModelIdMap = state.inferenceToModelIdMap;
      setIsUpdatingMappings(true);
      try {
        if (isSemanticTextEnabled && hasMLPermissions && hasSemanticText && !forceSaveMappings) {
          await ml?.mlApi?.savedObjects.syncSavedObjects();
          inferenceToModelIdMap = await fetchInferenceToModelIdMap();
        }
        const fields = hasSemanticText ? getStateWithCopyToFields(state).fields : state.fields;
        const denormalizedFields = deNormalize(fields);
        const inferenceIdsInPendingList = forceSaveMappings
          ? []
          : Object.values(denormalizedFields)
              .filter(isSemanticTextField)
              .map((field) => field.inference_id)
              .filter(
                (inferenceId: string) =>
                  inferenceId &&
                  inferenceToModelIdMap?.[inferenceId].trainedModelId && // third-party inference models don't have trainedModelId
                  !inferenceToModelIdMap?.[inferenceId].isDeployed &&
                  !isInferencePreconfigured(inferenceId)
              );
        setHasSavedFields(true);
        if (inferenceIdsInPendingList.length === 0) {
          const { error } = await updateIndexMappings(indexName, denormalizedFields);

          if (!error) {
            notificationService.showSuccessToast(
              i18n.translate(
                'xpack.idxMgmt.indexDetails.mappings.successfullyUpdatedIndexMappings',
                {
                  defaultMessage: 'Updated index mapping',
                }
              )
            );
            refetchMapping();
            setHasSavedFields(false);
          } else {
            setSaveMappingError(error.message);
          }
        }
      } catch (exception) {
        setSaveMappingError(exception.message);
      }
      setIsUpdatingMappings(false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.fields]
  );

  const onSearchChange = useCallback(
    (value: string) => {
      if (isAddingFields) {
        setPreviousState({
          ...previousState,
          search: {
            term: value,
            result: searchFields(
              value,
              previousStateSelectedDataTypes.length > 0
                ? getFieldsMatchingFilterFromState(previousState, previousStateSelectedDataTypes)
                : previousState.fields.byId
            ),
          },
        });
      } else {
        dispatch({ type: 'search:update', value });
      }
    },
    [dispatch, previousState, isAddingFields, previousStateSelectedDataTypes]
  );

  const onClearSearch = useCallback(() => {
    setPreviousState({
      ...previousState,
      search: {
        term: '',
        result: searchFields(
          '',
          previousState.filter.selectedDataTypes.length > 0
            ? getFieldsMatchingFilterFromState(
                previousState,
                previousState.filter.selectedDataTypes
              )
            : previousState.fields.byId
        ),
      },
    });
  }, [previousState]);

  const jsonBlock = (
    <EuiCodeBlock
      language="json"
      isCopyable
      data-test-subj="indexDetailsMappingsCodeBlock"
      css={css`
        height: 100%;
      `}
    >
      {data}
    </EuiCodeBlock>
  );
  const searchResultComponent = isAddingFields ? (
    <SearchResult
      result={previousState.search.result}
      documentFieldsState={previousState.documentFields}
      onClearSearch={onClearSearch}
    />
  ) : (
    <SearchResult result={state.search.result} documentFieldsState={state.documentFields} />
  );

  const fieldsListComponent = isAddingFields ? (
    <FieldsList
      fields={
        previousStateSelectedDataTypes.length > 0
          ? previousState.filter.filteredFields
          : getFieldsFromState(previousState.fields)
      }
      state={previousState}
      setPreviousState={setPreviousState}
      isAddingFields={isAddingFields}
    />
  ) : (
    <FieldsList
      fields={
        state.filter.selectedDataTypes.length > 0
          ? state.filter.filteredFields
          : getFieldsFromState(state.fields)
      }
      state={state}
      isAddingFields={isAddingFields}
    />
  );

  const treeViewBlock = (
    <>
      {multipleMappingsDeclared ? (
        <MultipleMappingsWarning />
      ) : searchTerm !== '' ? (
        searchResultComponent
      ) : (
        fieldsListComponent
      )}
    </>
  );

  const errorSavingMappings = saveMappingError && (
    <EuiFlexItem grow={false}>
      <EuiCallOut
        announceOnMount
        color="danger"
        data-test-subj="indexDetailsSaveMappingsError"
        iconType="error"
        title={i18n.translate('xpack.idxMgmt.indexDetails.mappings.error.title', {
          defaultMessage: 'Error saving mapping',
        })}
      >
        <EuiText>
          <FormattedMessage
            id="xpack.idxMgmt.indexDetails.mappings.error.description"
            defaultMessage="Error saving mapping: {errorMessage}"
            values={{ errorMessage: saveMappingError }}
          />
        </EuiText>
      </EuiCallOut>
      <EuiSpacer />
    </EuiFlexItem>
  );

  const mappingsWrapperStyles = css`
    height: 100%;
    ${useEuiBreakpoint(['xl'])} {
      flex-wrap: nowrap;
    }
  `;

  const saveMappingsButton = (
    <EuiButton
      onClick={() => updateMappings()}
      color="success"
      fill
      disabled={newFieldsLength === 0}
      data-test-subj="indexDetailsMappingsSaveMappings"
    >
      <FormattedMessage
        id="xpack.idxMgmt.indexDetails.mappings.saveMappings"
        defaultMessage="Save mapping"
      />
    </EuiButton>
  );

  useEffect(() => {
    const subscription = licensing?.license$.subscribe((license: ILicense) => {
      setIsPlatinumLicense(license.isActive && license.hasAtLeast('platinum'));
    });

    return () => subscription?.unsubscribe();
  }, [licensing]);

  useEffect(() => {
    if (!isSemanticTextEnabled || !hasMLPermissions) {
      return;
    }

    const fetchData = async () => {
      await fetchInferenceToModelIdMap();
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSemanticTextEnabled, hasMLPermissions]);

  return (
    <>
      {/* using "rowReverse" to keep docs links on the top of the mappings code block on smaller screen */}
      <EuiFlexGroup wrap direction="rowReverse" css={mappingsWrapperStyles}>
        {showAboutMappings && hasMappings && (
          <MappingsInformationPanels
            indexName={indexName}
            refetchMapping={refetchMapping}
            hasUpdateMappingsPrivilege={hasUpdateMappingsPrivilege}
          />
        )}
        <EuiFlexGroup direction="column" gutterSize="s">
          {hasMLPermissions && !hasSemanticText && (
            <EuiFlexItem grow={false}>
              <SemanticTextBanner
                isSemanticTextEnabled={isSemanticTextEnabled}
                isPlatinumLicense={isPlatinumLicense}
              />
            </EuiFlexItem>
          )}
          {!hasMappings &&
            (!isAddingFields ? (
              <EuiFlexItem grow={false}>
                <EmptyMappingsContent
                  addFieldButton={
                    <AddFieldButton
                      hasUpdateMappingsPrivilege={hasUpdateMappingsPrivilege}
                      addFieldButtonOnClick={addFieldButtonOnClick}
                    />
                  }
                />
              </EuiFlexItem>
            ) : (
              <EuiFlexItem grow={false}>
                <span>{saveMappingsButton}</span>
              </EuiFlexItem>
            ))}
          {hasMappings && (
            <EuiFlexGroup gutterSize="s" justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <MappingsFilter
                  isAddingFields={isAddingFields}
                  isJSONVisible={isJSONVisible}
                  previousState={previousState}
                  setPreviousState={setPreviousState}
                  state={state}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <DocumentFieldsSearch
                  searchValue={isAddingFields ? previousState.search.term : state.search.term}
                  onSearchChange={onSearchChange}
                  disabled={isJSONVisible}
                />
              </EuiFlexItem>
              {!index.hidden && (
                <EuiFlexItem grow={false}>
                  {!isAddingFields ? (
                    <AddFieldButton
                      color={'text'}
                      hasUpdateMappingsPrivilege={hasUpdateMappingsPrivilege}
                      addFieldButtonOnClick={addFieldButtonOnClick}
                    />
                  ) : (
                    saveMappingsButton
                  )}
                </EuiFlexItem>
              )}

              <EuiFlexItem grow={false}>
                <EuiFilterGroup
                  data-test-subj="indexDetailsMappingsToggleViewButton"
                  aria-label={i18n.translate(
                    'xpack.idxMgmt.indexDetails.mappings.mappingsViewButtonGroupAriaLabel',
                    {
                      defaultMessage: 'Mappings View Button Group',
                    }
                  )}
                  onClick={onToggleChange}
                >
                  <EuiFilterButton
                    isToggle
                    isSelected={!isJSONVisible}
                    hasActiveFilters={!isJSONVisible}
                    withNext
                  >
                    <FormattedMessage
                      id="xpack.idxMgmt.indexDetails.mappings.tableView"
                      defaultMessage="List"
                    />
                  </EuiFilterButton>
                  <EuiFilterButton
                    isToggle
                    isSelected={isJSONVisible}
                    hasActiveFilters={isJSONVisible}
                  >
                    <FormattedMessage
                      id="xpack.idxMgmt.indexDetails.mappings.json"
                      defaultMessage="JSON"
                    />
                  </EuiFilterButton>
                </EuiFilterGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
          {errorSavingMappings}
          {isAddingFields && (
            <EuiFlexItem grow={false} ref={pendingFieldsRef} tabIndex={0}>
              <EuiPanel hasBorder paddingSize="s">
                <EuiAccordion
                  id={pendingFieldListId}
                  initialIsOpen
                  buttonContent={
                    <EuiPanel paddingSize="s" hasShadow={false}>
                      <EuiFlexGroup
                        gutterSize="s"
                        alignItems="baseline"
                        data-test-subj="indexDetailsMappingsPendingBlock"
                      >
                        <EuiFlexItem grow={6}>
                          <EuiText size="m">
                            <FormattedMessage
                              id="xpack.idxMgmt.indexDetails.mappings.addMappingPendingBlock"
                              defaultMessage="Pending fields"
                            />
                          </EuiText>
                        </EuiFlexItem>
                        <EuiFlexItem>
                          <EuiNotificationBadge
                            color={newFieldsLength > 0 ? 'accent' : 'subdued'}
                            size="m"
                          >
                            {newFieldsLength}
                          </EuiNotificationBadge>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiPanel>
                  }
                >
                  <EuiPanel hasShadow={false} paddingSize="s">
                    <DocumentFields
                      onCancelAddingNewFields={
                        newFieldsLength <= 0 ? onCancelAddingNewFields : undefined
                      }
                      isAddingFields={isAddingFields}
                      semanticTextInfo={semanticTextInfo}
                      pendingFieldsRef={pendingFieldsRef}
                    />
                  </EuiPanel>
                </EuiAccordion>
              </EuiPanel>
            </EuiFlexItem>
          )}
          {hasMappings && (
            <EuiFlexItem
              grow={false}
              css={css`
                min-width: 600px;
                height: 100%;
              `}
            >
              <EuiPanel hasShadow={false} paddingSize="none">
                {isJSONVisible ? jsonBlock : treeViewBlock}
              </EuiPanel>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexGroup>
      {isSemanticTextEnabled && isAddingFields && hasSavedFields && (
        <TrainedModelsDeploymentModal
          errorsInTrainedModelDeployment={errorsInTrainedModelDeployment}
          forceSaveMappings={() => updateMappings(true)}
          saveMappings={() => updateMappings()}
          saveMappingsLoading={isUpdatingMappings}
          setErrorsInTrainedModelDeployment={setErrorsInTrainedModelDeployment}
        />
      )}
    </>
  );
};
