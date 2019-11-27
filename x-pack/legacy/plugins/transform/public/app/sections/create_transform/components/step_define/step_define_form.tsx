/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useEffect, useState } from 'react';

import { i18n } from '@kbn/i18n';

import { metadata } from 'ui/metadata';
import { toastNotifications } from 'ui/notify';

import {
  EuiButton,
  EuiCodeEditor,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormHelpText,
  EuiFormRow,
  EuiLink,
  EuiPanel,
  // @ts-ignore
  EuiSearchBar,
  EuiSpacer,
  EuiSwitch,
} from '@elastic/eui';

import { dictionaryToArray } from '../../../../../../common/types/common';
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
  AggName,
  DropDownLabel,
  getPivotQuery,
  getPreviewRequestBody,
  PivotAggDict,
  PivotAggsConfig,
  PivotAggsConfigDict,
  PivotGroupByDict,
  PivotGroupByConfig,
  PivotGroupByConfigDict,
  PivotSupportedGroupByAggs,
  PIVOT_SUPPORTED_AGGS,
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
export function isAggNameConflict(
  aggName: AggName,
  aggList: PivotAggsConfigDict,
  groupByList: PivotGroupByConfigDict
) {
  if (aggList[aggName] !== undefined) {
    toastNotifications.addDanger(
      i18n.translate('xpack.transform.stepDefineForm.aggExistsErrorMessage', {
        defaultMessage: `An aggregation configuration with the name '{aggName}' already exists.`,
        values: { aggName },
      })
    );
    return true;
  }

  if (groupByList[aggName] !== undefined) {
    toastNotifications.addDanger(
      i18n.translate('xpack.transform.stepDefineForm.groupByExistsErrorMessage', {
        defaultMessage: `A group by configuration with the name '{aggName}' already exists.`,
        values: { aggName },
      })
    );
    return true;
  }

  let conflict = false;

  // check the new aggName against existing aggs and groupbys
  const aggNameSplit = aggName.split('.');
  let aggNameCheck: string;
  aggNameSplit.forEach(aggNamePart => {
    aggNameCheck = aggNameCheck === undefined ? aggNamePart : `${aggNameCheck}.${aggNamePart}`;
    if (aggList[aggNameCheck] !== undefined || groupByList[aggNameCheck] !== undefined) {
      toastNotifications.addDanger(
        i18n.translate('xpack.transform.stepDefineForm.nestedConflictErrorMessage', {
          defaultMessage: `Couldn't add configuration '{aggName}' because of a nesting conflict with '{aggNameCheck}'.`,
          values: { aggName, aggNameCheck },
        })
      );
      conflict = true;
    }
  });

  if (conflict) {
    return true;
  }

  // check all aggs against new aggName
  conflict = Object.keys(aggList).some(aggListName => {
    const aggListNameSplit = aggListName.split('.');
    let aggListNameCheck: string;
    return aggListNameSplit.some(aggListNamePart => {
      aggListNameCheck =
        aggListNameCheck === undefined ? aggListNamePart : `${aggListNameCheck}.${aggListNamePart}`;
      if (aggListNameCheck === aggName) {
        toastNotifications.addDanger(
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

  if (conflict) {
    return true;
  }

  // check all group-bys against new aggName
  conflict = Object.keys(groupByList).some(groupByListName => {
    const groupByListNameSplit = groupByListName.split('.');
    let groupByListNameCheck: string;
    return groupByListNameSplit.some(groupByListNamePart => {
      groupByListNameCheck =
        groupByListNameCheck === undefined
          ? groupByListNamePart
          : `${groupByListNameCheck}.${groupByListNamePart}`;
      if (groupByListNameCheck === aggName) {
        toastNotifications.addDanger(
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

  return conflict;
}

interface Props {
  overrides?: StepDefineExposedState;
  onChange(s: StepDefineExposedState): void;
}

export const StepDefineForm: FC<Props> = React.memo(({ overrides = {}, onChange }) => {
  const kibanaContext = useKibanaContext();

  const defaults = { ...getDefaultStepDefineState(kibanaContext), ...overrides };

  // The search filter
  const [searchString, setSearchString] = useState(defaults.searchString);
  const [searchQuery, setSearchQuery] = useState(defaults.searchQuery);
  const [useKQL] = useState(true);

  const addToSearch = (newSearch: string) => {
    const currentDisplaySearch = searchString === defaultSearch ? emptySearch : searchString;
    setSearchString(`${currentDisplaySearch} ${newSearch}`.trim());
  };

  const searchHandler = (d: Record<string, any>) => {
    const { filterQuery, queryString } = d;
    const newSearch = queryString === emptySearch ? defaultSearch : queryString;
    const newSearchQuery =
      filterQuery.match_all && Object.keys(filterQuery.match_all).length === 0
        ? defaultSearch
        : filterQuery;
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

    if (isAggNameConflict(aggName, aggList, groupByList)) {
      return;
    }

    groupByList[aggName] = config;
    setGroupByList({ ...groupByList });
  };

  const updateGroupBy = (previousAggName: AggName, item: PivotGroupByConfig) => {
    const groupByListWithoutPrevious = { ...groupByList };
    delete groupByListWithoutPrevious[previousAggName];

    if (isAggNameConflict(item.aggName, aggList, groupByListWithoutPrevious)) {
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

    if (isAggNameConflict(aggName, aggList, groupByList)) {
      return;
    }

    aggList[aggName] = config;
    setAggList({ ...aggList });
  };

  const updateAggregation = (previousAggName: AggName, item: PivotAggsConfig) => {
    const aggListWithoutPrevious = { ...aggList };
    delete aggListWithoutPrevious[previousAggName];

    if (isAggNameConflict(item.aggName, aggListWithoutPrevious, groupByList)) {
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
  const [advancedEditorConfig, setAdvancedEditorConfig] = useState(stringifiedPivotConfig);
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
    const pivotConfig = JSON.parse(advancedEditorConfig);

    const newGroupByList: PivotGroupByConfigDict = {};
    if (pivotConfig !== undefined && pivotConfig.group_by !== undefined) {
      Object.entries(pivotConfig.group_by).forEach(d => {
        const aggName = d[0];
        const aggConfig = d[1] as PivotGroupByDict;
        const aggConfigKeys = Object.keys(aggConfig);
        const agg = aggConfigKeys[0] as PivotSupportedGroupByAggs;
        newGroupByList[aggName] = {
          agg,
          aggName,
          dropDownName: '',
          ...aggConfig[agg],
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
          agg,
          aggName,
          dropDownName: '',
          ...aggConfig[agg],
        };
      });
    }
    setAggList(newAggList);
    const prettyPivotConfig = JSON.stringify(pivotConfig, null, 2);

    setAdvancedEditorConfig(prettyPivotConfig);
    setAdvancedEditorConfigLastApplied(prettyPivotConfig);
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

  // metadata.branch corresponds to the version used in documentation links.
  const docsUrl = `https://www.elastic.co/guide/en/elasticsearch/reference/${metadata.branch}/transform-resource.html#transform-pivot`;
  const advancedEditorHelpText = (
    <Fragment>
      {i18n.translate('xpack.transform.stepDefineForm.advancedEditorHelpText', {
        defaultMessage:
          'The advanced editor allows you to edit the pivot configuration of the transform.',
      })}{' '}
      <EuiLink href={docsUrl} target="_blank">
        {i18n.translate('xpack.transform.stepDefineForm.advancedEditorHelpTextLink', {
          defaultMessage: 'Learn more about available options.',
        })}
      </EuiLink>
    </Fragment>
  );

  const sourceDocsUrl = `https://www.elastic.co/guide/en/elasticsearch/reference/${metadata.branch}/query-dsl.html`;
  const advancedSourceEditorHelpText = (
    <Fragment>
      {i18n.translate('xpack.transform.stepDefineForm.advancedSourceEditorHelpText', {
        defaultMessage:
          'The advanced editor allows you to edit the source query clause of the transform.',
      })}{' '}
      <EuiLink href={sourceDocsUrl} target="_blank">
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

    const stringifiedPivotConfigUpdate = JSON.stringify(previewRequestUpdate.pivot, null, 2);
    const stringifiedSourceConfigUpdate = JSON.stringify(
      previewRequestUpdate.source.query,
      null,
      2
    );
    setAdvancedEditorConfig(stringifiedPivotConfigUpdate);
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
    <EuiFlexGroup>
      <EuiFlexItem grow={false} style={{ minWidth: '420px' }}>
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
                      mode="json"
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
                          JSON.parse(d);
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

      <EuiFlexItem>
        <SourceIndexPreview cellClick={addToSearch} query={pivotQuery} />
        <EuiSpacer size="m" />
        <PivotPreview aggs={aggList} groupBy={groupByList} query={pivotQuery} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
