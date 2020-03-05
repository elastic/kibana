/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEqual } from 'lodash';
import React, { Fragment, FC, useEffect, useState } from 'react';

import { i18n } from '@kbn/i18n';

import {
  EuiButton,
  EuiCodeEditor,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormHelpText,
  EuiFormRow,
  EuiHorizontalRule,
  EuiLink,
  EuiPanel,
  // @ts-ignore
  EuiSearchBar,
  EuiSpacer,
  EuiSwitch,
} from '@elastic/eui';

import { useXJsonMode, xJsonMode } from '../../../../hooks/use_x_json_mode';
import { useDocumentationLinks, useToastNotifications } from '../../../../app_dependencies';
import { TransformPivotConfig } from '../../../../common';
import { dictionaryToArray, Dictionary } from '../../../../../../common/types/common';
import { DropDown } from '../aggregation_dropdown';
import { AggListForm } from '../aggregation_list';
import { GroupByListForm } from '../group_by_list';
import { SourceIndexPreview } from '../source_index_preview';
import { PivotPreview } from './pivot_preview';
import { KqlFilterBar } from '../../../../../shared_imports';
import { SwitchModal } from './switch_modal';

import {
  useKibanaContext,
  InitializedKibanaContextValue,
  SavedSearchQuery,
} from '../../../../lib/kibana';

import {
  getPivotQuery,
  getPreviewRequestBody,
  isMatchAllQuery,
  matchAllQuery,
  AggName,
  DropDownLabel,
  PivotAggDict,
  PivotAggsConfig,
  PivotAggsConfigDict,
  PivotGroupByDict,
  PivotGroupByConfig,
  PivotGroupByConfigDict,
  PivotSupportedGroupByAggs,
  PIVOT_SUPPORTED_AGGS,
  PIVOT_SUPPORTED_GROUP_BY_AGGS,
} from '../../../../common';

import { getPivotDropdownOptions } from './common';

export interface StepDefineExposedState {
  aggList: PivotAggsConfigDict;
  groupByList: PivotGroupByConfigDict;
  isAdvancedPivotEditorEnabled: boolean;
  isAdvancedSourceEditorEnabled: boolean;
  searchString: string | SavedSearchQuery;
  searchQuery: string | SavedSearchQuery;
  sourceConfigUpdated: boolean;
  valid: boolean;
}

const defaultSearch = '*';
const emptySearch = '';

export function getDefaultStepDefineState(
  kibanaContext: InitializedKibanaContextValue
): StepDefineExposedState {
  return {
    aggList: {} as PivotAggsConfigDict,
    groupByList: {} as PivotGroupByConfigDict,
    isAdvancedPivotEditorEnabled: false,
    isAdvancedSourceEditorEnabled: false,
    searchString:
      kibanaContext.currentSavedSearch !== undefined ? kibanaContext.combinedQuery : defaultSearch,
    searchQuery:
      kibanaContext.currentSavedSearch !== undefined ? kibanaContext.combinedQuery : defaultSearch,
    sourceConfigUpdated: false,
    valid: false,
  };
}

export function applyTransformConfigToDefineState(
  state: StepDefineExposedState,
  transformConfig?: TransformPivotConfig
): StepDefineExposedState {
  // apply the transform configuration to wizard DEFINE state
  if (transformConfig !== undefined) {
    // transform aggregations config to wizard state
    state.aggList = Object.keys(transformConfig.pivot.aggregations).reduce((aggList, aggName) => {
      const aggConfig = transformConfig.pivot.aggregations[aggName] as Dictionary<any>;
      const agg = Object.keys(aggConfig)[0];
      aggList[aggName] = {
        ...aggConfig[agg],
        agg: agg as PIVOT_SUPPORTED_AGGS,
        aggName,
        dropDownName: aggName,
      } as PivotAggsConfig;
      return aggList;
    }, {} as PivotAggsConfigDict);

    // transform group by config to wizard state
    state.groupByList = Object.keys(transformConfig.pivot.group_by).reduce(
      (groupByList, groupByName) => {
        const groupByConfig = transformConfig.pivot.group_by[groupByName] as Dictionary<any>;
        const groupBy = Object.keys(groupByConfig)[0];
        groupByList[groupByName] = {
          agg: groupBy as PIVOT_SUPPORTED_GROUP_BY_AGGS,
          aggName: groupByName,
          dropDownName: groupByName,
          ...groupByConfig[groupBy],
        } as PivotGroupByConfig;
        return groupByList;
      },
      {} as PivotGroupByConfigDict
    );

    // only apply the query from the transform config to wizard state if it's not the default query
    const query = transformConfig.source.query;
    if (query !== undefined && !isEqual(query, matchAllQuery)) {
      state.isAdvancedSourceEditorEnabled = true;
      state.searchString = '';
      state.searchQuery = query;
      state.sourceConfigUpdated = true;
    }

    // applying a transform config to wizard state will always result in a valid configuration
    state.valid = true;
  }

  return state;
}

export function getAggNameConflictToastMessages(
  aggName: AggName,
  aggList: PivotAggsConfigDict,
  groupByList: PivotGroupByConfigDict
): string[] {
  if (aggList[aggName] !== undefined) {
    return [
      i18n.translate('xpack.transform.stepDefineForm.aggExistsErrorMessage', {
        defaultMessage: `An aggregation configuration with the name '{aggName}' already exists.`,
        values: { aggName },
      }),
    ];
  }

  if (groupByList[aggName] !== undefined) {
    return [
      i18n.translate('xpack.transform.stepDefineForm.groupByExistsErrorMessage', {
        defaultMessage: `A group by configuration with the name '{aggName}' already exists.`,
        values: { aggName },
      }),
    ];
  }

  const conflicts: string[] = [];

  // check the new aggName against existing aggs and groupbys
  const aggNameSplit = aggName.split('.');
  let aggNameCheck: string;
  aggNameSplit.forEach(aggNamePart => {
    aggNameCheck = aggNameCheck === undefined ? aggNamePart : `${aggNameCheck}.${aggNamePart}`;
    if (aggList[aggNameCheck] !== undefined || groupByList[aggNameCheck] !== undefined) {
      conflicts.push(
        i18n.translate('xpack.transform.stepDefineForm.nestedConflictErrorMessage', {
          defaultMessage: `Couldn't add configuration '{aggName}' because of a nesting conflict with '{aggNameCheck}'.`,
          values: { aggName, aggNameCheck },
        })
      );
    }
  });

  if (conflicts.length > 0) {
    return conflicts;
  }

  // check all aggs against new aggName
  Object.keys(aggList).some(aggListName => {
    const aggListNameSplit = aggListName.split('.');
    let aggListNameCheck: string;
    return aggListNameSplit.some(aggListNamePart => {
      aggListNameCheck =
        aggListNameCheck === undefined ? aggListNamePart : `${aggListNameCheck}.${aggListNamePart}`;
      if (aggListNameCheck === aggName) {
        conflicts.push(
          i18n.translate('xpack.transform.stepDefineForm.nestedAggListConflictErrorMessage', {
            defaultMessage: `Couldn't add configuration '{aggName}' because of a nesting conflict with '{aggListName}'.`,
            values: { aggName, aggListName },
          })
        );
        return true;
      }
      return false;
    });
  });

  if (conflicts.length > 0) {
    return conflicts;
  }

  // check all group-bys against new aggName
  Object.keys(groupByList).some(groupByListName => {
    const groupByListNameSplit = groupByListName.split('.');
    let groupByListNameCheck: string;
    return groupByListNameSplit.some(groupByListNamePart => {
      groupByListNameCheck =
        groupByListNameCheck === undefined
          ? groupByListNamePart
          : `${groupByListNameCheck}.${groupByListNamePart}`;
      if (groupByListNameCheck === aggName) {
        conflicts.push(
          i18n.translate('xpack.transform.stepDefineForm.nestedGroupByListConflictErrorMessage', {
            defaultMessage: `Couldn't add configuration '{aggName}' because of a nesting conflict with '{groupByListName}'.`,
            values: { aggName, groupByListName },
          })
        );
        return true;
      }
      return false;
    });
  });

  return conflicts;
}

interface Props {
  overrides?: StepDefineExposedState;
  onChange(s: StepDefineExposedState): void;
}

export const StepDefineForm: FC<Props> = React.memo(({ overrides = {}, onChange }) => {
  const kibanaContext = useKibanaContext();
  const toastNotifications = useToastNotifications();
  const { esQueryDsl, esTransformPivot } = useDocumentationLinks();

  const defaults = { ...getDefaultStepDefineState(kibanaContext), ...overrides };

  // The search filter
  const [searchString, setSearchString] = useState(defaults.searchString);
  const [searchQuery, setSearchQuery] = useState(defaults.searchQuery);
  const [useKQL] = useState(true);

  const searchHandler = (d: Record<string, any>) => {
    const { filterQuery, queryString } = d;
    const newSearch = queryString === emptySearch ? defaultSearch : queryString;
    const newSearchQuery = isMatchAllQuery(filterQuery) ? defaultSearch : filterQuery;
    setSearchString(newSearch);
    setSearchQuery(newSearchQuery);
  };

  // The list of selected group by fields
  const [groupByList, setGroupByList] = useState(defaults.groupByList);

  const indexPattern = kibanaContext.currentIndexPattern;

  const {
    groupByOptions,
    groupByOptionsData,
    aggOptions,
    aggOptionsData,
  } = getPivotDropdownOptions(indexPattern);

  const addGroupBy = (d: DropDownLabel[]) => {
    const label: AggName = d[0].label;
    const config: PivotGroupByConfig = groupByOptionsData[label];
    const aggName: AggName = config.aggName;

    const aggNameConflictMessages = getAggNameConflictToastMessages(aggName, aggList, groupByList);
    if (aggNameConflictMessages.length > 0) {
      aggNameConflictMessages.forEach(m => toastNotifications.addDanger(m));
      return;
    }

    groupByList[aggName] = config;
    setGroupByList({ ...groupByList });
  };

  const updateGroupBy = (previousAggName: AggName, item: PivotGroupByConfig) => {
    const groupByListWithoutPrevious = { ...groupByList };
    delete groupByListWithoutPrevious[previousAggName];

    const aggNameConflictMessages = getAggNameConflictToastMessages(
      item.aggName,
      aggList,
      groupByListWithoutPrevious
    );
    if (aggNameConflictMessages.length > 0) {
      aggNameConflictMessages.forEach(m => toastNotifications.addDanger(m));
      return;
    }

    groupByListWithoutPrevious[item.aggName] = item;
    setGroupByList({ ...groupByListWithoutPrevious });
  };

  const deleteGroupBy = (aggName: AggName) => {
    delete groupByList[aggName];
    setGroupByList({ ...groupByList });
  };

  // The list of selected aggregations
  const [aggList, setAggList] = useState(defaults.aggList);

  const addAggregation = (d: DropDownLabel[]) => {
    const label: AggName = d[0].label;
    const config: PivotAggsConfig = aggOptionsData[label];
    const aggName: AggName = config.aggName;

    const aggNameConflictMessages = getAggNameConflictToastMessages(aggName, aggList, groupByList);
    if (aggNameConflictMessages.length > 0) {
      aggNameConflictMessages.forEach(m => toastNotifications.addDanger(m));
      return;
    }

    aggList[aggName] = config;
    setAggList({ ...aggList });
  };

  const updateAggregation = (previousAggName: AggName, item: PivotAggsConfig) => {
    const aggListWithoutPrevious = { ...aggList };
    delete aggListWithoutPrevious[previousAggName];

    const aggNameConflictMessages = getAggNameConflictToastMessages(
      item.aggName,
      aggListWithoutPrevious,
      groupByList
    );
    if (aggNameConflictMessages.length > 0) {
      aggNameConflictMessages.forEach(m => toastNotifications.addDanger(m));
      return;
    }

    aggListWithoutPrevious[item.aggName] = item;
    setAggList({ ...aggListWithoutPrevious });
  };

  const deleteAggregation = (aggName: AggName) => {
    delete aggList[aggName];
    setAggList({ ...aggList });
  };

  const pivotAggsArr = dictionaryToArray(aggList);
  const pivotGroupByArr = dictionaryToArray(groupByList);
  const pivotQuery = useKQL ? getPivotQuery(searchQuery) : getPivotQuery(searchString);

  // Advanced editor for pivot config state
  const [isAdvancedEditorSwitchModalVisible, setAdvancedEditorSwitchModalVisible] = useState(false);
  const [
    isAdvancedPivotEditorApplyButtonEnabled,
    setAdvancedPivotEditorApplyButtonEnabled,
  ] = useState(false);
  const [isAdvancedPivotEditorEnabled, setAdvancedPivotEditorEnabled] = useState(
    defaults.isAdvancedPivotEditorEnabled
  );
  // Advanced editor for source config state
  const [sourceConfigUpdated, setSourceConfigUpdated] = useState(defaults.sourceConfigUpdated);
  const [
    isAdvancedSourceEditorSwitchModalVisible,
    setAdvancedSourceEditorSwitchModalVisible,
  ] = useState(false);
  const [isAdvancedSourceEditorEnabled, setAdvancedSourceEditorEnabled] = useState(
    defaults.isAdvancedSourceEditorEnabled
  );
  const [
    isAdvancedSourceEditorApplyButtonEnabled,
    setAdvancedSourceEditorApplyButtonEnabled,
  ] = useState(false);

  const previewRequest = getPreviewRequestBody(
    indexPattern.title,
    pivotQuery,
    pivotGroupByArr,
    pivotAggsArr
  );
  // pivot config
  const stringifiedPivotConfig = JSON.stringify(previewRequest.pivot, null, 2);
  const [advancedEditorConfigLastApplied, setAdvancedEditorConfigLastApplied] = useState(
    stringifiedPivotConfig
  );

  const {
    convertToJson,
    setXJson: setAdvancedEditorConfig,
    xJson: advancedEditorConfig,
  } = useXJsonMode(stringifiedPivotConfig);

  useEffect(() => {
    setAdvancedEditorConfig(stringifiedPivotConfig);
  }, [setAdvancedEditorConfig, stringifiedPivotConfig]);

  // source config
  const stringifiedSourceConfig = JSON.stringify(previewRequest.source.query, null, 2);
  const [
    advancedEditorSourceConfigLastApplied,
    setAdvancedEditorSourceConfigLastApplied,
  ] = useState(stringifiedSourceConfig);
  const [advancedEditorSourceConfig, setAdvancedEditorSourceConfig] = useState(
    stringifiedSourceConfig
  );

  const applyAdvancedSourceEditorChanges = () => {
    const sourceConfig = JSON.parse(advancedEditorSourceConfig);
    const prettySourceConfig = JSON.stringify(sourceConfig, null, 2);
    // Switched to editor so we clear out the search string as the bar won't be visible
    setSearchString(emptySearch);
    setSearchQuery(sourceConfig);
    setSourceConfigUpdated(true);
    setAdvancedEditorSourceConfig(prettySourceConfig);
    setAdvancedEditorSourceConfigLastApplied(prettySourceConfig);
    setAdvancedSourceEditorApplyButtonEnabled(false);
  };

  const applyAdvancedPivotEditorChanges = () => {
    const pivotConfig = JSON.parse(convertToJson(advancedEditorConfig));

    const newGroupByList: PivotGroupByConfigDict = {};
    if (pivotConfig !== undefined && pivotConfig.group_by !== undefined) {
      Object.entries(pivotConfig.group_by).forEach(d => {
        const aggName = d[0];
        const aggConfig = d[1] as PivotGroupByDict;
        const aggConfigKeys = Object.keys(aggConfig);
        const agg = aggConfigKeys[0] as PivotSupportedGroupByAggs;
        newGroupByList[aggName] = {
          ...aggConfig[agg],
          agg,
          aggName,
          dropDownName: '',
        };
      });
    }
    setGroupByList(newGroupByList);

    const newAggList: PivotAggsConfigDict = {};
    if (pivotConfig !== undefined && pivotConfig.aggregations !== undefined) {
      Object.entries(pivotConfig.aggregations).forEach(d => {
        const aggName = d[0];
        const aggConfig = d[1] as PivotAggDict;
        const aggConfigKeys = Object.keys(aggConfig);
        const agg = aggConfigKeys[0] as PIVOT_SUPPORTED_AGGS;
        newAggList[aggName] = {
          ...aggConfig[agg],
          agg,
          aggName,
          dropDownName: '',
        };
      });
    }
    setAggList(newAggList);

    setAdvancedEditorConfigLastApplied(advancedEditorConfig);
    setAdvancedPivotEditorApplyButtonEnabled(false);
  };

  const toggleAdvancedEditor = () => {
    setAdvancedEditorConfig(advancedEditorConfig);
    setAdvancedPivotEditorEnabled(!isAdvancedPivotEditorEnabled);
    setAdvancedPivotEditorApplyButtonEnabled(false);
    if (isAdvancedPivotEditorEnabled === false) {
      setAdvancedEditorConfigLastApplied(advancedEditorConfig);
    }
  };
  // If switching to KQL after updating via editor - reset search
  const toggleAdvancedSourceEditor = (reset = false) => {
    if (reset === true) {
      setSearchQuery(defaultSearch);
      setSearchString(defaultSearch);
      setSourceConfigUpdated(false);
    }
    if (isAdvancedSourceEditorEnabled === false) {
      setAdvancedEditorSourceConfigLastApplied(advancedEditorSourceConfig);
    }

    setAdvancedSourceEditorEnabled(!isAdvancedSourceEditorEnabled);
    setAdvancedSourceEditorApplyButtonEnabled(false);
  };

  const advancedEditorHelpText = (
    <Fragment>
      {i18n.translate('xpack.transform.stepDefineForm.advancedEditorHelpText', {
        defaultMessage:
          'The advanced editor allows you to edit the pivot configuration of the transform.',
      })}{' '}
      <EuiLink href={esTransformPivot} target="_blank">
        {i18n.translate('xpack.transform.stepDefineForm.advancedEditorHelpTextLink', {
          defaultMessage: 'Learn more about available options.',
        })}
      </EuiLink>
    </Fragment>
  );

  const advancedSourceEditorHelpText = (
    <Fragment>
      {i18n.translate('xpack.transform.stepDefineForm.advancedSourceEditorHelpText', {
        defaultMessage:
          'The advanced editor allows you to edit the source query clause of the transform.',
      })}{' '}
      <EuiLink href={esQueryDsl} target="_blank">
        {i18n.translate('xpack.transform.stepDefineForm.advancedEditorHelpTextLink', {
          defaultMessage: 'Learn more about available options.',
        })}
      </EuiLink>
    </Fragment>
  );

  const valid = pivotGroupByArr.length > 0 && pivotAggsArr.length > 0;

  useEffect(() => {
    const previewRequestUpdate = getPreviewRequestBody(
      indexPattern.title,
      pivotQuery,
      pivotGroupByArr,
      pivotAggsArr
    );

    const stringifiedSourceConfigUpdate = JSON.stringify(
      previewRequestUpdate.source.query,
      null,
      2
    );
    setAdvancedEditorSourceConfig(stringifiedSourceConfigUpdate);

    onChange({
      aggList,
      groupByList,
      isAdvancedPivotEditorEnabled,
      isAdvancedSourceEditorEnabled,
      searchString,
      searchQuery,
      sourceConfigUpdated,
      valid,
    });
    // custom comparison
    /* eslint-disable react-hooks/exhaustive-deps */
  }, [
    JSON.stringify(pivotAggsArr),
    JSON.stringify(pivotGroupByArr),
    isAdvancedPivotEditorEnabled,
    isAdvancedSourceEditorEnabled,
    searchString,
    searchQuery,
    valid,
    /* eslint-enable react-hooks/exhaustive-deps */
  ]);

  // TODO This should use the actual value of `indices.query.bool.max_clause_count`
  const maxIndexFields = 1024;
  const numIndexFields = indexPattern.fields.length;
  const disabledQuery = numIndexFields > maxIndexFields;

  return (
    <EuiFlexGroup className="transform__stepDefineForm">
      <EuiFlexItem grow={false} className="transform__stepDefineFormLeftColumn">
        <div data-test-subj="transformStepDefineForm">
          <EuiForm>
            {kibanaContext.currentSavedSearch === undefined && typeof searchString === 'string' && (
              <Fragment>
                <EuiFormRow
                  label={i18n.translate('xpack.transform.stepDefineForm.indexPatternLabel', {
                    defaultMessage: 'Index pattern',
                  })}
                  helpText={
                    disabledQuery
                      ? i18n.translate('xpack.transform.stepDefineForm.indexPatternHelpText', {
                          defaultMessage:
                            'An optional query for this index pattern is not supported. The number of supported index fields is {maxIndexFields} whereas this index has {numIndexFields} fields.',
                          values: {
                            maxIndexFields,
                            numIndexFields,
                          },
                        })
                      : ''
                  }
                >
                  <span>{indexPattern.title}</span>
                </EuiFormRow>
                {!disabledQuery && (
                  <Fragment>
                    {!isAdvancedSourceEditorEnabled && (
                      <EuiFormRow
                        label={i18n.translate('xpack.transform.stepDefineForm.queryLabel', {
                          defaultMessage: 'Query',
                        })}
                        helpText={i18n.translate('xpack.transform.stepDefineForm.queryHelpText', {
                          defaultMessage: 'Use a query to filter the source data (optional).',
                        })}
                      >
                        <KqlFilterBar
                          indexPattern={indexPattern}
                          onSubmit={searchHandler}
                          initialValue={searchString === defaultSearch ? emptySearch : searchString}
                          placeholder={i18n.translate(
                            'xpack.transform.stepDefineForm.queryPlaceholder',
                            {
                              defaultMessage: 'e.g. {example}',
                              values: { example: 'method : "GET" or status : "404"' },
                            }
                          )}
                          testSubj="tarnsformQueryInput"
                        />
                      </EuiFormRow>
                    )}
                  </Fragment>
                )}
              </Fragment>
            )}

            {isAdvancedSourceEditorEnabled && (
              <Fragment>
                <EuiFormRow
                  label={i18n.translate(
                    'xpack.transform.stepDefineForm.advancedSourceEditorLabel',
                    {
                      defaultMessage: 'Source query clause',
                    }
                  )}
                  helpText={advancedSourceEditorHelpText}
                >
                  <EuiPanel grow={false} paddingSize="none">
                    <EuiCodeEditor
                      mode="json"
                      width="100%"
                      value={advancedEditorSourceConfig}
                      onChange={(d: string) => {
                        setAdvancedEditorSourceConfig(d);

                        // Disable the "Apply"-Button if the config hasn't changed.
                        if (advancedEditorSourceConfigLastApplied === d) {
                          setAdvancedSourceEditorApplyButtonEnabled(false);
                          return;
                        }

                        // Try to parse the string passed on from the editor.
                        // If parsing fails, the "Apply"-Button will be disabled
                        try {
                          JSON.parse(d);
                          setAdvancedSourceEditorApplyButtonEnabled(true);
                        } catch (e) {
                          setAdvancedSourceEditorApplyButtonEnabled(false);
                        }
                      }}
                      setOptions={{
                        fontSize: '12px',
                      }}
                      theme="textmate"
                      aria-label={i18n.translate(
                        'xpack.transform.stepDefineForm.advancedSourceEditorAriaLabel',
                        {
                          defaultMessage: 'Advanced query editor',
                        }
                      )}
                    />
                  </EuiPanel>
                </EuiFormRow>
              </Fragment>
            )}
            {kibanaContext.currentSavedSearch === undefined && (
              <EuiFormRow>
                <EuiFlexGroup gutterSize="none">
                  <EuiFlexItem>
                    <EuiSwitch
                      label={i18n.translate(
                        'xpack.transform.stepDefineForm.advancedEditorSourceConfigSwitchLabel',
                        {
                          defaultMessage: 'Advanced query editor',
                        }
                      )}
                      checked={isAdvancedSourceEditorEnabled}
                      onChange={() => {
                        if (isAdvancedSourceEditorEnabled && sourceConfigUpdated) {
                          setAdvancedSourceEditorSwitchModalVisible(true);
                          return;
                        }

                        toggleAdvancedSourceEditor();
                      }}
                      data-test-subj="transformAdvancedQueryEditorSwitch"
                    />
                    {isAdvancedSourceEditorSwitchModalVisible && (
                      <SwitchModal
                        onCancel={() => setAdvancedSourceEditorSwitchModalVisible(false)}
                        onConfirm={() => {
                          setAdvancedSourceEditorSwitchModalVisible(false);
                          toggleAdvancedSourceEditor(true);
                        }}
                        type={'source'}
                      />
                    )}
                  </EuiFlexItem>
                  {isAdvancedSourceEditorEnabled && (
                    <EuiButton
                      size="s"
                      fill
                      onClick={applyAdvancedSourceEditorChanges}
                      disabled={!isAdvancedSourceEditorApplyButtonEnabled}
                    >
                      {i18n.translate(
                        'xpack.transform.stepDefineForm.advancedSourceEditorApplyButtonText',
                        {
                          defaultMessage: 'Apply changes',
                        }
                      )}
                    </EuiButton>
                  )}
                </EuiFlexGroup>
              </EuiFormRow>
            )}
            {kibanaContext.currentSavedSearch !== undefined &&
              kibanaContext.currentSavedSearch.id !== undefined && (
                <EuiFormRow
                  label={i18n.translate('xpack.transform.stepDefineForm.savedSearchLabel', {
                    defaultMessage: 'Saved search',
                  })}
                >
                  <span>{kibanaContext.currentSavedSearch.title}</span>
                </EuiFormRow>
              )}

            {!isAdvancedPivotEditorEnabled && (
              <Fragment>
                <EuiFormRow
                  label={i18n.translate('xpack.transform.stepDefineForm.groupByLabel', {
                    defaultMessage: 'Group by',
                  })}
                >
                  <Fragment>
                    <GroupByListForm
                      list={groupByList}
                      options={groupByOptionsData}
                      onChange={updateGroupBy}
                      deleteHandler={deleteGroupBy}
                    />
                    <DropDown
                      changeHandler={addGroupBy}
                      options={groupByOptions}
                      placeholder={i18n.translate(
                        'xpack.transform.stepDefineForm.groupByPlaceholder',
                        {
                          defaultMessage: 'Add a group by field ...',
                        }
                      )}
                      testSubj="transformGroupBySelection"
                    />
                  </Fragment>
                </EuiFormRow>

                <EuiFormRow
                  label={i18n.translate('xpack.transform.stepDefineForm.aggregationsLabel', {
                    defaultMessage: 'Aggregations',
                  })}
                >
                  <Fragment>
                    <AggListForm
                      list={aggList}
                      options={aggOptionsData}
                      onChange={updateAggregation}
                      deleteHandler={deleteAggregation}
                    />
                    <DropDown
                      changeHandler={addAggregation}
                      options={aggOptions}
                      placeholder={i18n.translate(
                        'xpack.transform.stepDefineForm.aggregationsPlaceholder',
                        {
                          defaultMessage: 'Add an aggregation ...',
                        }
                      )}
                      testSubj="transformAggregationSelection"
                    />
                  </Fragment>
                </EuiFormRow>
              </Fragment>
            )}

            {isAdvancedPivotEditorEnabled && (
              <Fragment>
                <EuiFormRow
                  label={i18n.translate('xpack.transform.stepDefineForm.advancedEditorLabel', {
                    defaultMessage: 'Pivot configuration object',
                  })}
                  helpText={advancedEditorHelpText}
                >
                  <EuiPanel grow={false} paddingSize="none">
                    <EuiCodeEditor
                      data-test-subj="transformAdvancedPivotEditor"
                      mode={xJsonMode}
                      width="100%"
                      value={advancedEditorConfig}
                      onChange={(d: string) => {
                        setAdvancedEditorConfig(d);

                        // Disable the "Apply"-Button if the config hasn't changed.
                        if (advancedEditorConfigLastApplied === d) {
                          setAdvancedPivotEditorApplyButtonEnabled(false);
                          return;
                        }

                        // Try to parse the string passed on from the editor.
                        // If parsing fails, the "Apply"-Button will be disabled
                        try {
                          JSON.parse(convertToJson(d));
                          setAdvancedPivotEditorApplyButtonEnabled(true);
                        } catch (e) {
                          setAdvancedPivotEditorApplyButtonEnabled(false);
                        }
                      }}
                      setOptions={{
                        fontSize: '12px',
                      }}
                      theme="textmate"
                      aria-label={i18n.translate(
                        'xpack.transform.stepDefineForm.advancedEditorAriaLabel',
                        {
                          defaultMessage: 'Advanced pivot editor',
                        }
                      )}
                    />
                  </EuiPanel>
                </EuiFormRow>
              </Fragment>
            )}
            <EuiFormRow>
              <EuiFlexGroup gutterSize="none">
                <EuiFlexItem>
                  <EuiSwitch
                    label={i18n.translate(
                      'xpack.transform.stepDefineForm.advancedEditorSwitchLabel',
                      {
                        defaultMessage: 'Advanced pivot editor',
                      }
                    )}
                    checked={isAdvancedPivotEditorEnabled}
                    onChange={() => {
                      if (
                        isAdvancedPivotEditorEnabled &&
                        (isAdvancedPivotEditorApplyButtonEnabled ||
                          advancedEditorConfig !== advancedEditorConfigLastApplied)
                      ) {
                        setAdvancedEditorSwitchModalVisible(true);
                        return;
                      }

                      toggleAdvancedEditor();
                    }}
                    data-test-subj="transformAdvancedPivotEditorSwitch"
                  />
                  {isAdvancedEditorSwitchModalVisible && (
                    <SwitchModal
                      onCancel={() => setAdvancedEditorSwitchModalVisible(false)}
                      onConfirm={() => {
                        setAdvancedEditorSwitchModalVisible(false);
                        toggleAdvancedEditor();
                      }}
                      type={'pivot'}
                    />
                  )}
                </EuiFlexItem>
                {isAdvancedPivotEditorEnabled && (
                  <EuiButton
                    size="s"
                    fill
                    onClick={applyAdvancedPivotEditorChanges}
                    disabled={!isAdvancedPivotEditorApplyButtonEnabled}
                  >
                    {i18n.translate(
                      'xpack.transform.stepDefineForm.advancedEditorApplyButtonText',
                      {
                        defaultMessage: 'Apply changes',
                      }
                    )}
                  </EuiButton>
                )}
              </EuiFlexGroup>
            </EuiFormRow>
            {!valid && (
              <Fragment>
                <EuiSpacer size="m" />
                <EuiFormHelpText style={{ maxWidth: '320px' }}>
                  {i18n.translate('xpack.transform.stepDefineForm.formHelp', {
                    defaultMessage:
                      'Transforms are scalable and automated processes for pivoting. Choose at least one group-by and aggregation to get started.',
                  })}
                </EuiFormHelpText>
              </Fragment>
            )}
          </EuiForm>
        </div>
      </EuiFlexItem>

      <EuiFlexItem grow={false} style={{ maxWidth: 'calc(100% - 468px)' }}>
        <SourceIndexPreview query={pivotQuery} />
        <EuiHorizontalRule />
        <PivotPreview aggs={aggList} groupBy={groupByList} query={pivotQuery} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
