/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, SFC, useContext, useEffect, useState } from 'react';

import { i18n } from '@kbn/i18n';

import { metadata } from 'ui/metadata';
import { toastNotifications } from 'ui/notify';

import {
  EuiButton,
  EuiCodeEditor,
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormHelpText,
  EuiFormRow,
  EuiLink,
  EuiOverlayMask,
  EuiPanel,
  // @ts-ignore
  EuiSearchBar,
  EuiSpacer,
  EuiSwitch,
} from '@elastic/eui';

import { dictionaryToArray } from '../../../../common/types/common';
import { DropDown } from '../../components/aggregation_dropdown/dropdown';
import { AggListForm } from '../../components/aggregation_list';
import { GroupByListForm } from '../../components/group_by_list';
import { SourceIndexPreview } from '../../components/source_index_preview';
import { PivotPreview } from './pivot_preview';

import {
  AggName,
  DropDownLabel,
  getPivotQuery,
  getDataFramePreviewRequest,
  isKibanaContext,
  KibanaContext,
  KibanaContextValue,
  PivotAggDict,
  PivotAggsConfig,
  PivotAggsConfigDict,
  PivotGroupByDict,
  PivotGroupByConfig,
  PivotGroupByConfigDict,
  PivotSupportedGroupByAggs,
  PIVOT_SUPPORTED_AGGS,
  SavedSearchQuery,
} from '../../common';

import { getPivotDropdownOptions } from './common';

export interface DefinePivotExposedState {
  aggList: PivotAggsConfigDict;
  groupByList: PivotGroupByConfigDict;
  isAdvancedEditorEnabled: boolean;
  search: string | SavedSearchQuery;
  valid: boolean;
}

const defaultSearch = '*';
const emptySearch = '';

export function getDefaultPivotState(kibanaContext: KibanaContextValue): DefinePivotExposedState {
  return {
    aggList: {} as PivotAggsConfigDict,
    groupByList: {} as PivotGroupByConfigDict,
    isAdvancedEditorEnabled: false,
    search:
      kibanaContext.currentSavedSearch.id !== undefined
        ? kibanaContext.combinedQuery
        : defaultSearch,
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
      i18n.translate('xpack.ml.dataframe.definePivot.aggExistsErrorMessage', {
        defaultMessage: `An aggregation configuration with the name '{aggName}' already exists.`,
        values: { aggName },
      })
    );
    return true;
  }

  if (groupByList[aggName] !== undefined) {
    toastNotifications.addDanger(
      i18n.translate('xpack.ml.dataframe.definePivot.groupByExistsErrorMessage', {
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
        i18n.translate('xpack.ml.dataframe.definePivot.nestedConflictErrorMessage', {
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
          i18n.translate('xpack.ml.dataframe.definePivot.nestedAggListConflictErrorMessage', {
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
          i18n.translate('xpack.ml.dataframe.definePivot.nestedGroupByListConflictErrorMessage', {
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
  overrides?: DefinePivotExposedState;
  onChange(s: DefinePivotExposedState): void;
}

export const DefinePivotForm: SFC<Props> = React.memo(({ overrides = {}, onChange }) => {
  const kibanaContext = useContext(KibanaContext);

  if (!isKibanaContext(kibanaContext)) {
    return null;
  }

  const indexPattern = kibanaContext.currentIndexPattern;

  const defaults = { ...getDefaultPivotState(kibanaContext), ...overrides };

  // The search filter
  const [search, setSearch] = useState(defaults.search);

  const addToSearch = (newSearch: string) => {
    const currentDisplaySearch = search === defaultSearch ? emptySearch : search;
    setSearch(`${currentDisplaySearch} ${newSearch}`.trim());
  };

  const searchHandler = (d: Record<string, any>) => {
    const newSearch = d.queryText === emptySearch ? defaultSearch : d.queryText;
    setSearch(newSearch);
  };

  // The list of selected group by fields
  const [groupByList, setGroupByList] = useState(defaults.groupByList);

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
  const pivotQuery = getPivotQuery(search);

  // Advanced editor state
  const [isAdvancedEditorSwitchModalVisible, setAdvancedEditorSwitchModalVisible] = useState(false);
  const [isAdvancedEditorApplyButtonEnabled, setAdvancedEditorApplyButtonEnabled] = useState(false);
  const [isAdvancedEditorEnabled, setAdvancedEditorEnabled] = useState(
    defaults.isAdvancedEditorEnabled
  );

  const previewRequest = getDataFramePreviewRequest(
    indexPattern.title,
    pivotQuery,
    pivotGroupByArr,
    pivotAggsArr
  );
  const stringifiedPivotConfig = JSON.stringify(previewRequest.pivot, null, 2);
  const [advancedEditorConfigLastApplied, setAdvancedEditorConfigLastApplied] = useState(
    stringifiedPivotConfig
  );
  const [advancedEditorConfig, setAdvancedEditorConfig] = useState(stringifiedPivotConfig);

  const applyAdvancedEditorChanges = () => {
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
    setAdvancedEditorApplyButtonEnabled(false);
  };

  const toggleAdvancedEditor = () => {
    setAdvancedEditorConfig(advancedEditorConfig);
    setAdvancedEditorEnabled(!isAdvancedEditorEnabled);
    setAdvancedEditorApplyButtonEnabled(false);
    if (isAdvancedEditorEnabled === false) {
      setAdvancedEditorConfigLastApplied(advancedEditorConfig);
    }
  };

  // metadata.branch corresponds to the version used in documentation links.
  const docsUrl = `https://www.elastic.co/guide/en/elasticsearch/reference/${metadata.branch}/data-frame-transform-pivot.html`;
  const advancedEditorHelpText = (
    <Fragment>
      {i18n.translate('xpack.ml.dataframe.definePivotForm.advancedEditorHelpText', {
        defaultMessage:
          'The advanced editor allows you to edit the pivot configuration of the data frame transform.',
      })}{' '}
      <EuiLink href={docsUrl} target="_blank">
        {i18n.translate('xpack.ml.dataframe.definePivotForm.advancedEditorHelpTextLink', {
          defaultMessage: 'Learn more about available options.',
        })}
      </EuiLink>
    </Fragment>
  );

  const valid = pivotGroupByArr.length > 0 && pivotAggsArr.length > 0;

  useEffect(() => {
    const previewRequestUpdate = getDataFramePreviewRequest(
      indexPattern.title,
      pivotQuery,
      pivotGroupByArr,
      pivotAggsArr
    );

    const stringifiedPivotConfigUpdate = JSON.stringify(previewRequestUpdate.pivot, null, 2);
    setAdvancedEditorConfig(stringifiedPivotConfigUpdate);

    onChange({
      aggList,
      groupByList,
      isAdvancedEditorEnabled,
      search,
      valid,
    });
  }, [
    JSON.stringify(pivotAggsArr),
    JSON.stringify(pivotGroupByArr),
    isAdvancedEditorEnabled,
    search,
    valid,
  ]);

  // TODO This should use the actual value of `indices.query.bool.max_clause_count`
  const maxIndexFields = 1024;
  const numIndexFields = indexPattern.fields.length;
  const disabledQuery = numIndexFields > maxIndexFields;

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={false} style={{ minWidth: '420px' }}>
        <EuiForm>
          {kibanaContext.currentSavedSearch.id === undefined && typeof search === 'string' && (
            <Fragment>
              <EuiFormRow
                label={i18n.translate('xpack.ml.dataframe.definePivotForm.indexPatternLabel', {
                  defaultMessage: 'Index pattern',
                })}
                helpText={
                  disabledQuery
                    ? i18n.translate('xpack.ml.dataframe.definePivotForm.indexPatternHelpText', {
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
                <span>{kibanaContext.currentIndexPattern.title}</span>
              </EuiFormRow>
              {!disabledQuery && (
                <EuiFormRow
                  label={i18n.translate('xpack.ml.dataframe.definePivotForm.queryLabel', {
                    defaultMessage: 'Query',
                  })}
                  helpText={i18n.translate('xpack.ml.dataframe.definePivotForm.queryHelpText', {
                    defaultMessage: 'Use a query string to filter the source data (optional).',
                  })}
                >
                  <EuiSearchBar
                    defaultQuery={search === defaultSearch ? emptySearch : search}
                    box={{
                      placeholder: i18n.translate(
                        'xpack.ml.dataframe.definePivotForm.queryPlaceholder',
                        {
                          defaultMessage: 'e.g. {example}',
                          values: { example: 'method:GET -is:active' },
                        }
                      ),
                      incremental: false,
                    }}
                    onChange={searchHandler}
                  />
                </EuiFormRow>
              )}
            </Fragment>
          )}

          {kibanaContext.currentSavedSearch.id !== undefined && (
            <EuiFormRow
              label={i18n.translate('xpack.ml.dataframe.definePivotForm.savedSearchLabel', {
                defaultMessage: 'Saved search',
              })}
            >
              <span>{kibanaContext.currentSavedSearch.title}</span>
            </EuiFormRow>
          )}

          {!isAdvancedEditorEnabled && (
            <Fragment>
              <EuiFormRow
                label={i18n.translate('xpack.ml.dataframe.definePivotForm.groupByLabel', {
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
                      'xpack.ml.dataframe.definePivotForm.groupByPlaceholder',
                      {
                        defaultMessage: 'Add a group by field ...',
                      }
                    )}
                  />
                </Fragment>
              </EuiFormRow>

              <EuiFormRow
                label={i18n.translate('xpack.ml.dataframe.definePivotForm.aggregationsLabel', {
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
                      'xpack.ml.dataframe.definePivotForm.aggregationsPlaceholder',
                      {
                        defaultMessage: 'Add an aggregation ...',
                      }
                    )}
                  />
                </Fragment>
              </EuiFormRow>
            </Fragment>
          )}

          {isAdvancedEditorEnabled && (
            <Fragment>
              <EuiFormRow
                label={i18n.translate('xpack.ml.dataframe.definePivotForm.advancedEditorLabel', {
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
                        setAdvancedEditorApplyButtonEnabled(false);
                        return;
                      }

                      // Try to parse the string passed on from the editor.
                      // If parsing fails, the "Apply"-Button will be disabled
                      try {
                        JSON.parse(d);
                        setAdvancedEditorApplyButtonEnabled(true);
                      } catch (e) {
                        setAdvancedEditorApplyButtonEnabled(false);
                      }
                    }}
                    setOptions={{
                      fontSize: '12px',
                    }}
                    aria-label={i18n.translate(
                      'xpack.ml.dataframe.definePivotForm.advancedEditorAriaLabel',
                      {
                        defaultMessage: 'Advanced editor',
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
                    'xpack.ml.dataframe.definePivotForm.advancedEditorSwitchLabel',
                    {
                      defaultMessage: 'Advanced editor',
                    }
                  )}
                  checked={isAdvancedEditorEnabled}
                  onChange={() => {
                    if (
                      isAdvancedEditorEnabled &&
                      (isAdvancedEditorApplyButtonEnabled ||
                        advancedEditorConfig !== advancedEditorConfigLastApplied)
                    ) {
                      setAdvancedEditorSwitchModalVisible(true);
                      return;
                    }

                    toggleAdvancedEditor();
                  }}
                />
                {isAdvancedEditorSwitchModalVisible && (
                  <EuiOverlayMask>
                    <EuiConfirmModal
                      title={i18n.translate(
                        'xpack.ml.dataframe.definePivotForm.advancedEditorSwitchModalTitle',
                        {
                          defaultMessage: 'Unapplied changes',
                        }
                      )}
                      onCancel={() => setAdvancedEditorSwitchModalVisible(false)}
                      onConfirm={() => {
                        setAdvancedEditorSwitchModalVisible(false);
                        toggleAdvancedEditor();
                      }}
                      cancelButtonText={i18n.translate(
                        'xpack.ml.dataframe.definePivotForm.advancedEditorSwitchModalCancelButtonText',
                        {
                          defaultMessage: 'Cancel',
                        }
                      )}
                      confirmButtonText={i18n.translate(
                        'xpack.ml.dataframe.definePivotForm.advancedEditorSwitchModalConfirmButtonText',
                        {
                          defaultMessage: 'Disable advanced editor',
                        }
                      )}
                      buttonColor="danger"
                      defaultFocusedButton="confirm"
                    >
                      <p>
                        {i18n.translate(
                          'xpack.ml.dataframe.definePivotForm.advancedEditorSwitchModalBodyText',
                          {
                            defaultMessage: `The changes in the advanced editor haven't been applied yet. By disabling the advanced editor you will lose your edits.`,
                          }
                        )}
                      </p>
                    </EuiConfirmModal>
                  </EuiOverlayMask>
                )}
              </EuiFlexItem>
              {isAdvancedEditorEnabled && (
                <EuiButton
                  size="s"
                  fill
                  onClick={applyAdvancedEditorChanges}
                  disabled={!isAdvancedEditorApplyButtonEnabled}
                >
                  {i18n.translate(
                    'xpack.ml.dataframe.definePivotForm.advancedEditorApplyButtonText',
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
              <EuiFormHelpText style={{ maxWidth: '320px' }}>
                {i18n.translate('xpack.ml.dataframe.definePivotForm.formHelp', {
                  defaultMessage:
                    'Data frame transforms are scalable and automated processes for pivoting. Choose at least one group-by and aggregation to get started.',
                })}
              </EuiFormHelpText>
            </Fragment>
          )}
        </EuiForm>
      </EuiFlexItem>

      <EuiFlexItem>
        <SourceIndexPreview cellClick={addToSearch} query={pivotQuery} />
        <EuiSpacer size="l" />
        <PivotPreview aggs={aggList} groupBy={groupByList} query={pivotQuery} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
