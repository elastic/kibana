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
  EuiIcon,
  EuiLink,
  EuiNotificationBadge,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
  useEuiBreakpoint,
  EuiToolTip,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { FunctionComponent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ILicense } from '@kbn/licensing-plugin/public';
import { useUnsavedChangesPrompt } from '@kbn/unsaved-changes-prompt';
import {
  getStateWithCopyToFields,
  isSemanticTextField,
} from '../../../../components/mappings_editor/lib/utils';
import { Index } from '../../../../../../common';
import { useDetailsPageMappingsModelManagement } from '../../../../../hooks/use_details_page_mappings_model_management';
import { useAppContext } from '../../../../app_context';
import { DocumentFields } from '../../../../components/mappings_editor/components';
import { DocumentFieldsSearch } from '../../../../components/mappings_editor/components/document_fields/document_fields_search';
import { FieldsList } from '../../../../components/mappings_editor/components/document_fields/fields';
import { SearchResult } from '../../../../components/mappings_editor/components/document_fields/search_fields';
import { MultipleMappingsWarning } from '../../../../components/mappings_editor/components/multiple_mappings_warning';
import { deNormalize, searchFields } from '../../../../components/mappings_editor/lib';
import { MappingsEditorParsedMetadata } from '../../../../components/mappings_editor/mappings_editor';
import {
  useDispatch,
  useMappingsState,
} from '../../../../components/mappings_editor/mappings_state_context';
import {
  getFieldsFromState,
  getFieldsMatchingFilterFromState,
} from '../../../../components/mappings_editor/lib';
import { NormalizedFields, State } from '../../../../components/mappings_editor/types';
import { MappingsFilter } from './details_page_filter_fields';

import { useMappingsStateListener } from '../../../../components/mappings_editor/use_state_listener';
import { documentationService } from '../../../../services';
import { updateIndexMappings } from '../../../../services/api';
import { notificationService } from '../../../../services/notification';
import { SemanticTextBanner } from './semantic_text_banner';
import { TrainedModelsDeploymentModal } from './trained_models_deployment_modal';
import { parseMappings } from '../../../../shared/parse_mappings';

const isInferencePreconfigured = (inferenceId: string) => inferenceId.startsWith('.');

export const DetailsPageMappingsContent: FunctionComponent<{
  index: Index;
  data: string;
  showAboutMappings: boolean;
  jsonData: any;
  refetchMapping: () => void;
  hasUpdateMappingsPrivilege?: boolean;
}> = ({ index, data, jsonData, refetchMapping, showAboutMappings, hasUpdateMappingsPrivilege }) => {
  const {
    services: { extensionsService },
    core: {
      getUrlForApp,
      application: { capabilities, navigateToUrl },
      http,
    },
    plugins: { ml, licensing },
    config,
    overlays,
    history,
  } = useAppContext();
  const pendingFieldsRef = useRef<HTMLDivElement>(null);

  const [isPlatinumLicense, setIsPlatinumLicense] = useState<boolean>(false);
  useEffect(() => {
    const subscription = licensing?.license$.subscribe((license: ILicense) => {
      setIsPlatinumLicense(license.isActive && license.hasAtLeast('platinum'));
    });

    return () => subscription?.unsubscribe();
  }, [licensing]);

  const { enableSemanticText: isSemanticTextEnabled } = config;
  const [errorsInTrainedModelDeployment, setErrorsInTrainedModelDeployment] = useState<
    Record<string, string | undefined>
  >({});

  const hasMLPermissions = capabilities?.ml?.canGetTrainedModels ? true : false;

  const semanticTextInfo = {
    isSemanticTextEnabled: isSemanticTextEnabled && hasMLPermissions && isPlatinumLicense,
    indexName: index.name,
    ml,
    setErrorsInTrainedModelDeployment,
  };

  const state = useMappingsState();
  const dispatch = useDispatch();

  const indexName = index.name;

  const pendingFieldListId = useGeneratedHtmlId({
    prefix: 'pendingFieldListId',
  });

  const [isAddingFields, setAddingFields] = useState<boolean>(false);

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

  const newFieldsLength = useMemo(() => {
    return Object.keys(state.fields.byId).length;
  }, [state.fields.byId]);

  const [previousState, setPreviousState] = useState<State>(state);

  const previousStateSelectedDataTypes: string[] = useMemo(() => {
    return previousState.filter.selectedOptions
      .filter((option) => option.checked === 'on')
      .map((option) => option.label);
  }, [previousState.filter.selectedOptions]);

  const [saveMappingError, setSaveMappingError] = useState<string | undefined>(undefined);
  const [isJSONVisible, setIsJSONVisible] = useState<boolean>(false);
  const onToggleChange = () => {
    setIsJSONVisible(!isJSONVisible);
  };

  const { parsedDefaultValue, multipleMappingsDeclared } = useMemo<MappingsEditorParsedMetadata>(
    () => parseMappings(jsonData),
    [jsonData]
  );

  const [hasSavedFields, setHasSavedFields] = useState<boolean>(false);
  const [isUpdatingMappings, setIsUpdatingMappings] = useState<boolean>(false);

  useMappingsStateListener({ value: parsedDefaultValue, status: 'disabled' });
  const { fetchInferenceToModelIdMap } = useDetailsPageMappingsModelManagement();

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

  const updateMappings = useCallback(
    async (forceSaveMappings?: boolean) => {
      const hasSemanticText = hasSemanticTextField(state.fields);
      let inferenceToModelIdMap = state.inferenceToModelIdMap;
      setIsUpdatingMappings(true);
      try {
        if (isSemanticTextEnabled && hasMLPermissions && hasSemanticText && !forceSaveMappings) {
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

  const searchTerm = isAddingFields ? previousState.search.term.trim() : state.search.term.trim();

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
  const fieldSearchComponent = isAddingFields ? (
    <DocumentFieldsSearch
      searchValue={previousState.search.term}
      onSearchChange={onSearchChange}
      disabled={isJSONVisible}
    />
  ) : (
    <DocumentFieldsSearch
      searchValue={state.search.term}
      onSearchChange={onSearchChange}
      disabled={isJSONVisible}
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

  const showAboutMappingsStyles = css`
    ${useEuiBreakpoint(['xl'])} {
      max-width: 480px;
    }
  `;

  const mappingsWrapperStyles = css`
    height: 100%;
    ${useEuiBreakpoint(['xl'])} {
      flex-wrap: nowrap;
    }
  `;

  return (
    // using "rowReverse" to keep docs links on the top of the mappings code block on smaller screen
    <>
      <EuiFlexGroup wrap direction="rowReverse" css={mappingsWrapperStyles}>
        {showAboutMappings && (
          <EuiFlexItem grow={false} css={showAboutMappingsStyles}>
            <EuiPanel grow={false} paddingSize="l" color="subdued">
              <EuiFlexGroup alignItems="center" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiIcon type="iInCircle" />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiTitle size="xs">
                    <h2>
                      <FormattedMessage
                        id="xpack.idxMgmt.indexDetails.mappings.docsCardTitle"
                        defaultMessage="About index mappings"
                      />
                    </h2>
                  </EuiTitle>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="s" />
              <EuiText>
                <p>
                  <FormattedMessage
                    id="xpack.idxMgmt.indexDetails.mappings.docsCardDescription"
                    defaultMessage="Your documents are made up of a set of fields. Index mappings give each field a type
                      (such as keyword, number, or date) and additional subfields. These index mappings determine the functions
                      available in your relevance tuning and search experience."
                  />
                </p>
              </EuiText>
              <EuiSpacer size="m" />
              <EuiLink
                data-test-subj="indexDetailsMappingsDocsLink"
                href={documentationService.getMappingDocumentationLink()}
                target="_blank"
                external
              >
                <FormattedMessage
                  id="xpack.idxMgmt.indexDetails.mappings.docsCardLink"
                  defaultMessage="Learn more about mappings"
                />
              </EuiLink>
            </EuiPanel>
            {extensionsService.indexMappingsContent && (
              <>
                <EuiSpacer />
                {extensionsService.indexMappingsContent.renderContent({ index, getUrlForApp })}
              </>
            )}
          </EuiFlexItem>
        )}
        <EuiFlexGroup direction="column" gutterSize="s">
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
            <EuiFlexItem>{fieldSearchComponent}</EuiFlexItem>
            {!index.hidden && (
              <EuiFlexItem grow={false}>
                {!isAddingFields ? (
                  <EuiToolTip
                    position="bottom"
                    data-test-subj="indexDetailsMappingsAddFieldTooltip"
                    content={
                      /* for serverless search users hasUpdateMappingsPrivilege flag indicates if user has privilege to update index mappings, for stack hasUpdateMappingsPrivilege would be undefined */
                      hasUpdateMappingsPrivilege === false
                        ? i18n.translate('xpack.idxMgmt.indexDetails.mappings.addNewFieldToolTip', {
                            defaultMessage: 'You do not have permission to add fields in an Index',
                          })
                        : undefined
                    }
                  >
                    <EuiButton
                      onClick={addFieldButtonOnClick}
                      iconType="plusInCircle"
                      color="text"
                      size="m"
                      data-test-subj="indexDetailsMappingsAddField"
                      isDisabled={hasUpdateMappingsPrivilege === false}
                    >
                      <FormattedMessage
                        id="xpack.idxMgmt.indexDetails.mappings.addNewField"
                        defaultMessage="Add field"
                      />
                    </EuiButton>
                  </EuiToolTip>
                ) : (
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
                <EuiFilterButton hasActiveFilters={!isJSONVisible} withNext>
                  <FormattedMessage
                    id="xpack.idxMgmt.indexDetails.mappings.tableView"
                    defaultMessage="List"
                  />
                </EuiFilterButton>
                <EuiFilterButton hasActiveFilters={isJSONVisible}>
                  <FormattedMessage
                    id="xpack.idxMgmt.indexDetails.mappings.json"
                    defaultMessage="JSON"
                  />
                </EuiFilterButton>
              </EuiFilterGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
          {hasMLPermissions && (
            <EuiFlexItem grow={true}>
              <SemanticTextBanner
                isSemanticTextEnabled={isSemanticTextEnabled}
                isPlatinumLicense={isPlatinumLicense}
              />
            </EuiFlexItem>
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
                    {newFieldsLength <= 0 ? (
                      <DocumentFields
                        onCancelAddingNewFields={onCancelAddingNewFields}
                        isAddingFields={isAddingFields}
                        semanticTextInfo={semanticTextInfo}
                        pendingFieldsRef={pendingFieldsRef}
                      />
                    ) : (
                      <DocumentFields
                        isAddingFields={isAddingFields}
                        semanticTextInfo={semanticTextInfo}
                        pendingFieldsRef={pendingFieldsRef}
                      />
                    )}
                  </EuiPanel>
                </EuiAccordion>
              </EuiPanel>
            </EuiFlexItem>
          )}

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

function hasSemanticTextField(fields: NormalizedFields): boolean {
  return Object.values(fields.byId).some((field) => field.source.type === 'semantic_text');
}
