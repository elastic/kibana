/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useContext, useEffect, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiComboBox,
  EuiComboBoxOptionProps,
  EuiExpression,
  EuiFieldNumber,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiPageContent,
  EuiPopover,
  EuiPopoverTitle,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';

import { TIME_UNITS } from '../../../../../common/constants';
import { ErrableFormRow, SectionError } from '../../../../components';
import { fetchFields, getMatchingIndices, loadIndexPatterns } from '../../../../lib/api';
import { aggTypes } from '../../../../models/watch/agg_types';
import { groupByTypes } from '../../../../models/watch/group_by_types';
import { comparators } from '../../../../models/watch/comparators';
import { timeUnits } from '../../time_units';
import { onWatchSave } from '../../watch_edit_actions';
import { WatchContext } from '../../watch_context';
import { WatchVisualization } from './watch_visualization';
import { WatchActionsPanel } from './threshold_watch_action_panel';

const firstFieldOption = {
  text: i18n.translate('xpack.watcher.sections.watchEdit.titlePanel.timeFieldOptionLabel', {
    defaultMessage: 'Select a field',
  }),
  value: '',
};

const getTimeOptions = (unitSize: string) =>
  Object.entries(timeUnits)
    .filter(([key]) => key !== TIME_UNITS.MILLISECOND)
    .map(([key, value]) => {
      return {
        text: unitSize && parseInt(unitSize, 10) === 1 ? value.labelSingular : value.labelPlural,
        value: key,
      };
    });

const getFields = async (indices: string[]) => {
  return await fetchFields(indices);
};
const getTimeFieldOptions = (fields: any) => {
  const options = [firstFieldOption];
  if (!fields.length) {
    return options;
  }

  fields.forEach((field: any) => {
    if (field.type === 'date') {
      options.push({
        text: field.name,
        value: field.name,
      });
    }
  });
  return options;
};
interface IOption {
  label: string;
  options: Array<{ value: string; label: string }>;
}
const getIndexOptions = async (patternString: string, indexPatterns: string[]) => {
  const options: IOption[] = [];
  if (!patternString) {
    return options;
  }
  const matchingIndices = (await getMatchingIndices(patternString)) as string[];
  const matchingIndexPatterns = indexPatterns.filter(anIndexPattern => {
    return anIndexPattern.includes(patternString);
  }) as string[];
  if (matchingIndices) {
    options.push({
      label: i18n.translate('xpack.watcher.sections.watchEdit.titlePanel.indicesAndAliasesLabel', {
        defaultMessage: 'Based on your indices/aliases',
      }),
      options: matchingIndices.map(matchingIndex => {
        return {
          label: matchingIndex,
          value: matchingIndex,
        };
      }),
    });
  }
  if (matchingIndexPatterns) {
    options.push({
      label: i18n.translate('xpack.watcher.sections.watchEdit.titlePanel.indexPatternLabel', {
        defaultMessage: 'Based on your index patterns',
      }),
      options: matchingIndexPatterns.map(matchingIndexPattern => {
        return {
          label: matchingIndexPattern,
          value: matchingIndexPattern,
        };
      }),
    });
  }
  options.push({
    label: i18n.translate('xpack.watcher.sections.watchEdit.titlePanel.chooseLabel', {
      defaultMessage: 'Choose…',
    }),
    options: [
      {
        value: patternString,
        label: patternString,
      },
    ],
  });
  return options;
};

const ThresholdWatchEditUi = ({ intl, pageTitle }: { intl: InjectedIntl; pageTitle: string }) => {
  // hooks
  const [indexPatterns, setIndexPatterns] = useState([]);
  const [esFields, setEsFields] = useState([]);
  const [indexOptions, setIndexOptions] = useState<IOption[]>([]);
  const [timeFieldOptions, setTimeFieldOptions] = useState([firstFieldOption]);

  const [aggFieldPopoverOpen, setAggFieldPopoverOpen] = useState(false);
  const [groupByPopoverOpen, setGroupByPopoverOpen] = useState(false);
  const [watchThresholdPopoverOpen, setWatchThresholdPopoverOpen] = useState(false);
  const [watchDurationPopoverOpen, setWatchDurationPopoverOpen] = useState(false);
  const [aggTypePopoverOpen, setAggTypePopoverOpen] = useState(false);
  const [serverError, setServerError] = useState<{
    data: { nessage: string; error: string };
  } | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const { watch, setWatchProperty } = useContext(WatchContext);

  const getIndexPatterns = async () => {
    const indexPatternObjects = await loadIndexPatterns();
    const titles = indexPatternObjects.map((indexPattern: any) => indexPattern.attributes.title);
    setIndexPatterns(titles);
  };
  const loadData = async () => {
    if (watch.index && watch.index.length > 0) {
      const allEsFields = await getFields(watch.index);
      const timeFields = getTimeFieldOptions(allEsFields);
      setEsFields(allEsFields);
      setTimeFieldOptions(timeFields);
      setWatchProperty('timeFields', timeFields);
    }
    getIndexPatterns();
  };
  useEffect(() => {
    loadData();
  }, []);
  const { errors } = watch.validate();
  const hasErrors = !!Object.keys(errors).find(errorKey => errors[errorKey].length >= 1);
  const actionErrors = watch.actions.reduce((acc: any, action: any) => {
    const actionValidationErrors = action.validate();
    acc[action.id] = actionValidationErrors;
    return acc;
  }, {});
  const hasActionErrors = !!Object.keys(actionErrors).find(actionError => {
    return !!Object.keys(actionErrors[actionError]).find((actionErrorKey: string) => {
      return actionErrors[actionError][actionErrorKey].length >= 1;
    });
  });
  const expressionErrorMessage = i18n.translate(
    'xpack.watcher.thresholdWatchExpression.fixErrorInExpressionBelowValidationMessage',
    {
      defaultMessage: 'Expression contains errors.',
    }
  );
  const expressionFields = [
    'aggField',
    'termSize',
    'termField',
    'threshold0',
    'threshold1',
    'timeWindowSize',
  ];
  const hasExpressionErrors = !!Object.keys(errors).find(
    errorKey => expressionFields.includes(errorKey) && errors[errorKey].length >= 1
  );
  const shouldShowThresholdExpression = watch.index && watch.index.length > 0 && watch.timeField;
  const andThresholdText = i18n.translate('xpack.watcher.sections.watchEdit.threshold.andLabel', {
    defaultMessage: 'AND',
  });

  return (
    <EuiPageContent>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiTitle size="m">
            <h1 data-test-subj="pageTitle">{pageTitle}</h1>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            {watch.titleDescription}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      <EuiForm data-test-subj="thresholdWatchForm">
        {serverError && (
          <Fragment>
            <SectionError
              title={
                <FormattedMessage
                  id="xpack.watcher.sections.watchEdit.json.saveWatchErrorTitle"
                  defaultMessage="Error saving watch"
                />
              }
              error={serverError}
            />
            <EuiSpacer />
          </Fragment>
        )}
        <ErrableFormRow
          id="watchName"
          label={
            <FormattedMessage
              id="xpack.watcher.sections.watchEdit.titlePanel.watchNameLabel"
              defaultMessage="Name"
            />
          }
          errorKey="name"
          isShowingErrors={hasErrors && watch.name !== undefined}
          errors={errors}
        >
          <EuiFieldText
            name="name"
            data-test-subj="nameInput"
            value={watch.name || ''}
            onChange={e => {
              setWatchProperty('name', e.target.value);
            }}
            onBlur={() => {
              if (!watch.name) {
                setWatchProperty('name', '');
              }
            }}
          />
        </ErrableFormRow>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem>
            <ErrableFormRow
              id="indexSelectSearchBox"
              fullWidth
              label={
                <FormattedMessage
                  id="xpack.watcher.sections.watchEdit.titlePanel.indicesToQueryLabel"
                  defaultMessage="Indices to query"
                />
              }
              errorKey="index"
              isShowingErrors={hasErrors && watch.index !== undefined}
              errors={errors}
              helpText={
                <FormattedMessage
                  id="xpack.watcher.sections.watchEdit.titlePanel.howToBroadenSearchQueryDescription"
                  defaultMessage="Use * to broaden your query."
                />
              }
            >
              <EuiComboBox
                fullWidth
                noSuggestions={!indexOptions.length}
                options={indexOptions}
                data-test-subj="indicesComboBox"
                selectedOptions={(watch.index || []).map((anIndex: string) => {
                  return {
                    label: anIndex,
                    value: anIndex,
                  };
                })}
                onChange={async (selected: EuiComboBoxOptionProps[]) => {
                  setWatchProperty('index', selected.map(aSelected => aSelected.value));
                  const indices = selected.map(s => s.value as string);

                  // reset the time field if indices are deleted
                  if (indices.length === 0) {
                    setTimeFieldOptions(getTimeFieldOptions([]));
                    setWatchProperty('timeFields', []);
                    return;
                  }
                  const currentEsFields = await getFields(indices);
                  const timeFields = getTimeFieldOptions(currentEsFields);

                  setEsFields(currentEsFields);
                  setWatchProperty('timeFields', timeFields);
                  setTimeFieldOptions(timeFields);
                }}
                onSearchChange={async search => {
                  setIndexOptions(await getIndexOptions(search, indexPatterns));
                }}
                onBlur={() => {
                  if (!watch.index) {
                    setWatchProperty('index', []);
                  }
                }}
              />
            </ErrableFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ErrableFormRow
              id="timeField"
              fullWidth
              label={
                <FormattedMessage
                  id="xpack.watcher.sections.watchEdit.titlePanel.timeFieldLabel"
                  defaultMessage="Time field"
                />
              }
              errorKey="timeField"
              isShowingErrors={hasErrors && watch.timeField !== undefined}
              errors={errors}
            >
              <EuiSelect
                options={timeFieldOptions}
                fullWidth
                name="watchTimeField"
                data-test-subj="watchTimeFieldSelect"
                value={watch.timeField}
                onChange={e => {
                  setWatchProperty('timeField', e.target.value);
                }}
                onBlur={() => {
                  if (watch.timeField === undefined) {
                    setWatchProperty('timeField', '');
                  }
                }}
              />
            </ErrableFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <ErrableFormRow
              id="watchInterval"
              fullWidth
              label={intl.formatMessage({
                id: 'xpack.watcher.sections.watchEdit.titlePanel.watchIntervalLabel',
                defaultMessage: 'Run watch every',
              })}
              errorKey="triggerIntervalSize"
              isShowingErrors={hasErrors && watch.triggerIntervalSize !== undefined}
              errors={errors}
            >
              <EuiFlexGroup>
                <EuiFlexItem>
                  <EuiFieldNumber
                    fullWidth
                    min={1}
                    value={watch.triggerIntervalSize}
                    data-test-subj="triggerIntervalSizeInput"
                    onChange={e => {
                      const { value } = e.target;
                      const triggerIntervalSize = value !== '' ? parseInt(value, 10) : value;
                      setWatchProperty('triggerIntervalSize', triggerIntervalSize);
                    }}
                    onBlur={e => {
                      if (watch.triggerIntervalSize === undefined) {
                        setWatchProperty('triggerIntervalSize', '');
                      }
                    }}
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiSelect
                    fullWidth
                    value={watch.triggerIntervalUnit}
                    aria-label={intl.formatMessage({
                      id: 'xpack.watcher.sections.watchEdit.titlePanel.durationAriaLabel',
                      defaultMessage: 'Duration time unit',
                    })}
                    onChange={e => {
                      setWatchProperty('triggerIntervalUnit', e.target.value);
                    }}
                    options={getTimeOptions(watch.triggerIntervalSize)}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </ErrableFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer />
        {shouldShowThresholdExpression ? (
          <Fragment>
            <EuiTitle size="s">
              <h3 data-test-subj="watchConditionTitle">
                <FormattedMessage
                  id="xpack.watcher.sections.watchEdit.watchConditionSectionTitle"
                  defaultMessage="Match the following condition"
                />
              </h3>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiPopover
                  id="aggTypePopover"
                  button={
                    <EuiExpression
                      description={i18n.translate(
                        'xpack.watcher.sections.watchEdit.threshold.whenLabel',
                        {
                          defaultMessage: 'when',
                        }
                      )}
                      value={aggTypes[watch.aggType].text}
                      isActive={aggTypePopoverOpen}
                      onClick={() => {
                        setAggTypePopoverOpen(true);
                      }}
                    />
                  }
                  isOpen={aggTypePopoverOpen}
                  closePopover={() => {
                    setAggTypePopoverOpen(false);
                  }}
                  ownFocus
                  withTitle
                  anchorPosition="downLeft"
                >
                  <div>
                    <EuiPopoverTitle>
                      {i18n.translate(
                        'xpack.watcher.sections.watchEdit.threshold.whenButtonLabel',
                        {
                          defaultMessage: 'when',
                        }
                      )}
                    </EuiPopoverTitle>
                    <EuiSelect
                      value={watch.aggType}
                      onChange={e => {
                        setWatchProperty('aggType', e.target.value);
                        setAggTypePopoverOpen(false);
                      }}
                      options={Object.values(aggTypes).map(({ text, value }) => {
                        return {
                          text,
                          value,
                        };
                      })}
                    />
                  </div>
                </EuiPopover>
              </EuiFlexItem>
              {watch.aggType && aggTypes[watch.aggType].fieldRequired ? (
                <EuiFlexItem grow={false}>
                  <EuiPopover
                    id="aggFieldPopover"
                    button={
                      <EuiExpression
                        description={i18n.translate(
                          'xpack.watcher.sections.watchEdit.threshold.ofLabel',
                          {
                            defaultMessage: 'of',
                          }
                        )}
                        value={watch.aggField || firstFieldOption.text}
                        isActive={aggFieldPopoverOpen || !watch.aggField}
                        onClick={() => {
                          setAggFieldPopoverOpen(true);
                        }}
                        color={watch.aggField ? 'secondary' : 'danger'}
                      />
                    }
                    isOpen={aggFieldPopoverOpen}
                    closePopover={() => {
                      setAggFieldPopoverOpen(false);
                    }}
                    ownFocus
                    anchorPosition="downLeft"
                  >
                    <div>
                      <EuiPopoverTitle>
                        {i18n.translate(
                          'xpack.watcher.sections.watchEdit.threshold.ofButtonLabel',
                          {
                            defaultMessage: 'of',
                          }
                        )}
                      </EuiPopoverTitle>
                      <EuiFlexGroup>
                        <EuiFlexItem grow={false} style={{ width: 150 }}>
                          <ErrableFormRow
                            errorKey="aggField"
                            isShowingErrors={hasErrors && watch.aggField !== undefined}
                            errors={errors}
                          >
                            <EuiSelect
                              value={watch.aggField}
                              onChange={e => {
                                setWatchProperty('aggField', e.target.value);
                              }}
                              onBlur={() => {
                                if (!watch.aggField) {
                                  setWatchProperty('aggField', '');
                                }
                              }}
                              options={esFields.reduce(
                                (options, field: any) => {
                                  if (
                                    aggTypes[watch.aggType].validNormalizedTypes.includes(
                                      field.normalizedType
                                    )
                                  ) {
                                    options.push({
                                      text: field.name,
                                      value: field.name,
                                    });
                                  }
                                  return options;
                                },
                                [firstFieldOption]
                              )}
                            />
                          </ErrableFormRow>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </div>
                  </EuiPopover>
                </EuiFlexItem>
              ) : null}
              <EuiFlexItem grow={false}>
                <EuiPopover
                  id="groupByPopover"
                  button={
                    <EuiExpression
                      description={`${
                        groupByTypes[watch.groupBy].sizeRequired
                          ? i18n.translate(
                              'xpack.watcher.sections.watchEdit.threshold.groupedOverLabel',
                              {
                                defaultMessage: 'grouped over',
                              }
                            )
                          : i18n.translate('xpack.watcher.sections.watchEdit.threshold.overLabel', {
                              defaultMessage: 'over',
                            })
                      }`}
                      value={`${groupByTypes[watch.groupBy].text} ${
                        groupByTypes[watch.groupBy].sizeRequired
                          ? `${watch.termSize || ''} ${
                              watch.termField ? `'${watch.termField}'` : ''
                            }`
                          : ''
                      }`}
                      isActive={
                        groupByPopoverOpen ||
                        (watch.groupBy === 'top' && !(watch.termSize && watch.termField))
                      }
                      onClick={() => {
                        setGroupByPopoverOpen(true);
                      }}
                      color={
                        watch.groupBy === 'all' || (watch.termSize && watch.termField)
                          ? 'secondary'
                          : 'danger'
                      }
                    />
                  }
                  isOpen={groupByPopoverOpen}
                  closePopover={() => {
                    setGroupByPopoverOpen(false);
                  }}
                  ownFocus
                  withTitle
                  anchorPosition="downLeft"
                >
                  <div>
                    <EuiPopoverTitle>
                      {i18n.translate(
                        'xpack.watcher.sections.watchEdit.threshold.overButtonLabel',
                        {
                          defaultMessage: 'over',
                        }
                      )}
                    </EuiPopoverTitle>
                    <EuiFlexGroup>
                      <EuiFlexItem grow={false}>
                        <EuiSelect
                          value={watch.groupBy}
                          onChange={e => {
                            setWatchProperty('termSize', null);
                            setWatchProperty('termField', null);
                            setWatchProperty('groupBy', e.target.value);
                          }}
                          options={Object.values(groupByTypes).map(({ text, value }) => {
                            return {
                              text,
                              value,
                            };
                          })}
                        />
                      </EuiFlexItem>

                      {groupByTypes[watch.groupBy].sizeRequired ? (
                        <Fragment>
                          <EuiFlexItem grow={false}>
                            <ErrableFormRow
                              errorKey="termSize"
                              isShowingErrors={hasErrors}
                              errors={errors}
                            >
                              <EuiFieldNumber
                                value={watch.termSize}
                                onChange={e => {
                                  setWatchProperty('termSize', e.target.value);
                                }}
                                min={1}
                              />
                            </ErrableFormRow>
                          </EuiFlexItem>
                          <EuiFlexItem grow={false}>
                            <ErrableFormRow
                              errorKey="termField"
                              isShowingErrors={hasErrors && watch.termField !== undefined}
                              errors={errors}
                            >
                              <EuiSelect
                                value={watch.termField || ''}
                                onChange={e => {
                                  setWatchProperty('termField', e.target.value);
                                }}
                                options={esFields.reduce(
                                  (options, field: any) => {
                                    if (
                                      groupByTypes[watch.groupBy].validNormalizedTypes.includes(
                                        field.normalizedType
                                      )
                                    ) {
                                      options.push({
                                        text: field.name,
                                        value: field.name,
                                      });
                                    }
                                    return options;
                                  },
                                  [firstFieldOption]
                                )}
                              />
                            </ErrableFormRow>
                          </EuiFlexItem>
                        </Fragment>
                      ) : null}
                    </EuiFlexGroup>
                  </div>
                </EuiPopover>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiPopover
                  id="watchThresholdPopover"
                  button={
                    <EuiExpression
                      description={comparators[watch.thresholdComparator].text}
                      value={watch.threshold
                        .slice(0, comparators[watch.thresholdComparator].requiredValues)
                        .join(` ${andThresholdText} `)}
                      isActive={Boolean(
                        watchThresholdPopoverOpen ||
                          errors.threshold0.length ||
                          (errors.threshold1 && errors.threshold1.length)
                      )}
                      onClick={() => {
                        setWatchThresholdPopoverOpen(true);
                      }}
                      color={
                        errors.threshold0.length || (errors.threshold1 && errors.threshold1.length)
                          ? 'danger'
                          : 'secondary'
                      }
                    />
                  }
                  isOpen={watchThresholdPopoverOpen}
                  closePopover={() => {
                    setWatchThresholdPopoverOpen(false);
                  }}
                  ownFocus
                  withTitle
                  anchorPosition="downLeft"
                >
                  <div>
                    <EuiPopoverTitle>{comparators[watch.thresholdComparator].text}</EuiPopoverTitle>
                    <EuiFlexGroup>
                      <EuiFlexItem grow={false}>
                        <EuiSelect
                          value={watch.thresholdComparator}
                          onChange={e => {
                            setWatchProperty('thresholdComparator', e.target.value);
                          }}
                          options={Object.values(comparators).map(({ text, value }) => {
                            return { text, value };
                          })}
                        />
                      </EuiFlexItem>
                      {Array.from(Array(comparators[watch.thresholdComparator].requiredValues)).map(
                        (_notUsed, i) => {
                          return (
                            <Fragment key={`threshold${i}`}>
                              {i > 0 ? (
                                <EuiFlexItem
                                  grow={false}
                                  className="watcherThresholdWatchInBetweenComparatorText"
                                >
                                  <EuiText>{andThresholdText}</EuiText>
                                  {hasErrors && <EuiSpacer />}
                                </EuiFlexItem>
                              ) : null}
                              <EuiFlexItem grow={false}>
                                <ErrableFormRow
                                  errorKey={`threshold${i}`}
                                  isShowingErrors={hasErrors}
                                  errors={errors}
                                >
                                  <EuiFieldNumber
                                    value={watch.threshold[i] == null ? '' : watch.threshold[i]}
                                    min={1}
                                    onChange={e => {
                                      const { value } = e.target;
                                      const threshold = value !== '' ? parseInt(value, 10) : value;
                                      const newThreshold = [...watch.threshold];
                                      newThreshold[i] = threshold;
                                      setWatchProperty('threshold', newThreshold);
                                    }}
                                  />
                                </ErrableFormRow>
                              </EuiFlexItem>
                            </Fragment>
                          );
                        }
                      )}
                    </EuiFlexGroup>
                  </div>
                </EuiPopover>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiPopover
                  id="watchDurationPopover"
                  button={
                    <EuiExpression
                      description={i18n.translate(
                        'xpack.watcher.sections.watchEdit.threshold.forTheLastLabel',
                        {
                          defaultMessage: 'for the last',
                        }
                      )}
                      value={`${watch.timeWindowSize} ${
                        watch.timeWindowSize && parseInt(watch.timeWindowSize, 10) === 1
                          ? timeUnits[watch.timeWindowUnit].labelSingular
                          : timeUnits[watch.timeWindowUnit].labelPlural
                      }`}
                      isActive={watchDurationPopoverOpen || !watch.timeWindowSize}
                      onClick={() => {
                        setWatchDurationPopoverOpen(true);
                      }}
                      color={watch.timeWindowSize ? 'secondary' : 'danger'}
                    />
                  }
                  isOpen={watchDurationPopoverOpen}
                  closePopover={() => {
                    setWatchDurationPopoverOpen(false);
                  }}
                  ownFocus
                  withTitle
                  anchorPosition="downLeft"
                >
                  <div>
                    <EuiPopoverTitle>
                      <FormattedMessage
                        id="xpack.watcher.sections.watchEdit.threshold.forTheLastButtonLabel"
                        defaultMessage="For the last"
                      />
                    </EuiPopoverTitle>
                    <EuiFlexGroup>
                      <EuiFlexItem grow={false}>
                        <ErrableFormRow
                          errorKey="timeWindowSize"
                          isShowingErrors={hasErrors}
                          errors={errors}
                        >
                          <EuiFieldNumber
                            min={1}
                            value={watch.timeWindowSize || ''}
                            onChange={e => {
                              const { value } = e.target;
                              const timeWindowSize = value !== '' ? parseInt(value, 10) : value;
                              setWatchProperty('timeWindowSize', timeWindowSize);
                            }}
                          />
                        </ErrableFormRow>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiSelect
                          value={watch.timeWindowUnit}
                          onChange={e => {
                            setWatchProperty('timeWindowUnit', e.target.value);
                          }}
                          options={getTimeOptions(watch.timeWindowSize)}
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </div>
                </EuiPopover>
              </EuiFlexItem>
            </EuiFlexGroup>
            {hasExpressionErrors ? (
              <Fragment>
                <EuiSpacer size="m" />
                <EuiText color="danger" size="s">
                  {expressionErrorMessage}
                </EuiText>
                <EuiSpacer size="m" />
              </Fragment>
            ) : null}
            {hasErrors ? null : (
              <Fragment>
                <WatchVisualization />
                <WatchActionsPanel actionErrors={actionErrors} />
              </Fragment>
            )}
            <EuiSpacer />
          </Fragment>
        ) : null}
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              color="secondary"
              data-test-subj="saveWatchButton"
              type="submit"
              iconType="check"
              isDisabled={hasErrors || hasActionErrors}
              isLoading={isSaving}
              onClick={async () => {
                setIsSaving(true);
                const savedWatch = await onWatchSave(watch);
                if (savedWatch && savedWatch.error) {
                  setIsSaving(false);
                  return setServerError(savedWatch.error);
                }
              }}
            >
              {watch.isNew ? (
                <FormattedMessage
                  id="xpack.watcher.sections.watchEdit.threshold.createButtonLabel"
                  defaultMessage="Create alert"
                />
              ) : (
                <FormattedMessage
                  id="xpack.watcher.sections.watchEdit.threshold.saveButtonLabel"
                  defaultMessage="Save alert"
                />
              )}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty href={'#/management/elasticsearch/watcher/watches'}>
              {i18n.translate('xpack.watcher.sections.watchEdit.threshold.cancelButtonLabel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiForm>
    </EuiPageContent>
  );
};

export const ThresholdWatchEdit = injectI18n(ThresholdWatchEditUi);
