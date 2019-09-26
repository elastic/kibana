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

import { ConfirmWatchesModal, ErrableFormRow } from '../../../../components';
import { fetchFields, getMatchingIndices, loadIndexPatterns } from '../../../../lib/api';
import { aggTypes } from '../../../../models/watch/agg_types';
import { groupByTypes } from '../../../../models/watch/group_by_types';
import { comparators } from '../../../../models/watch/comparators';
import { timeUnits } from '../../time_units';
import { onWatchSave, saveWatch } from '../../watch_edit_actions';
import { WatchContext } from '../../watch_context';
import { WatchVisualization } from './watch_visualization';
import { WatchActionsPanel } from './threshold_watch_action_panel';
import { LicenseServiceContext } from '../../../../license_service_context';
const firstFieldOption = {
  text: i18n.translate('xpack.watcher.sections.watchEdit.titlePanel.timeFieldOptionLabel', {
    defaultMessage: 'Select a field',
  }),
  value: '',
};
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
      defaultMessage: 'Choose...',
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
  const [fields, setFields] = useState([]);
  const [indexOptions, setIndexOptions] = useState<IOption[]>([]);
  const [timeFieldOptions, setTimeFieldOptions] = useState([firstFieldOption]);

  const [aggFieldPopoverOpen, setAggFieldPopoverOpen] = useState(false);
  const [groupByPopoverOpen, setGroupByPopoverOpen] = useState(false);
  const [watchThresholdPopoverOpen, setWatchThresholdPopoverOpen] = useState(false);
  const [watchDurationPopoverOpen, setWatchDurationPopoverOpen] = useState(false);
  const [aggTypePopoverOpen, setAggTypePopoverOpen] = useState(false);
  const [modal, setModal] = useState<{ title: string; message: string } | null>(null);
  const { watch, setWatchProperty } = useContext(WatchContext);
  const licenseService = useContext(LicenseServiceContext);

  const getIndexPatterns = async () => {
    const indexPatternObjects = await loadIndexPatterns();
    const titles = indexPatternObjects.map((indexPattern: any) => indexPattern.attributes.title);
    setIndexPatterns(titles);
  };
  const loadData = async () => {
    if (watch.index && watch.index.length > 0) {
      const theFields = await getFields(watch.index);
      setFields(theFields);
      setTimeFieldOptions(getTimeFieldOptions(theFields));
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
      defaultMessage: 'Please fix the errors in the expression below.',
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
            <h1>{pageTitle}</h1>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            {watch.titleDescription}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      <ConfirmWatchesModal
        modalOptions={modal}
        callback={async isConfirmed => {
          if (isConfirmed) {
            saveWatch(watch, licenseService);
          }
          setModal(null);
        }}
      />
      <EuiForm>
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
            data-test-subj="thresholdWatchName"
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
          <EuiFlexItem grow={false}>
            <ErrableFormRow
              id="indexSelectSearchBox"
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
                  defaultMessage="Use * to broaden your search query"
                />
              }
            >
              <EuiComboBox
                noSuggestions={!indexOptions.length}
                options={indexOptions}
                selectedOptions={(watch.index || []).map((anIndex: string) => {
                  return {
                    label: anIndex,
                    value: anIndex,
                  };
                })}
                onChange={async (selected: EuiComboBoxOptionProps[]) => {
                  setWatchProperty('index', selected.map(aSelected => aSelected.value));
                  const indices = selected.map(s => s.value as string);
                  const theFields = await getFields(indices);
                  setFields(theFields);

                  setTimeFieldOptions(getTimeFieldOptions(theFields));
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
                name="watchTimeField"
                data-test-subj="watchTimeSelect"
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
                    min={1}
                    value={watch.triggerIntervalSize}
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
                    value={watch.triggerIntervalUnit}
                    aria-label={intl.formatMessage({
                      id: 'xpack.watcher.sections.watchEdit.titlePanel.durationAriaLabel',
                      defaultMessage: 'Duration time unit',
                    })}
                    onChange={e => {
                      setWatchProperty('triggerIntervalUnit', e.target.value);
                    }}
                    options={[
                      {
                        value: 's',
                        text: intl.formatMessage({
                          id: 'xpack.watcher.sections.watchEdit.titlePanel.secondsLabel',
                          defaultMessage: 'seconds',
                        }),
                      },
                      {
                        value: 'm',
                        text: intl.formatMessage({
                          id: 'xpack.watcher.sections.watchEdit.titlePanel.minutesLabel',
                          defaultMessage: 'minutes',
                        }),
                      },
                      {
                        value: 'd',
                        text: intl.formatMessage({
                          id: 'xpack.watcher.sections.watchEdit.titlePanel.daysLabel',
                          defaultMessage: 'days',
                        }),
                      },
                      {
                        value: 'h',
                        text: intl.formatMessage({
                          id: 'xpack.watcher.sections.watchEdit.titlePanel.hoursLabel',
                          defaultMessage: 'hours',
                        }),
                      },
                    ]}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </ErrableFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer />
        {shouldShowThresholdExpression ? (
          <Fragment>
            {hasExpressionErrors ? (
              <Fragment>
                <EuiText color="danger">{expressionErrorMessage}</EuiText>
                <EuiSpacer size="s" />
              </Fragment>
            ) : null}
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
                              options={fields.reduce(
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
                                options={fields.reduce(
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
                      isActive={
                        watchThresholdPopoverOpen ||
                        errors.threshold0.length ||
                        (errors.threshold1 && errors.threshold1.length)
                      }
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
                    <EuiFlexGroup alignItems="center">
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
                        (notUsed, i) => {
                          return (
                            <Fragment key={`threshold${i}`}>
                              {i > 0 ? (
                                <EuiFlexItem grow={false}>
                                  <EuiText>{andThresholdText}</EuiText>
                                </EuiFlexItem>
                              ) : null}
                              <EuiFlexItem grow={false}>
                                <ErrableFormRow
                                  errorKey={`threshold${i}`}
                                  isShowingErrors={hasErrors}
                                  errors={errors}
                                >
                                  <EuiFieldNumber
                                    value={watch.threshold[i]}
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
                    <EuiPopoverTitle>For the last</EuiPopoverTitle>
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
                          options={Object.entries(timeUnits).map(([key, value]) => {
                            return {
                              text:
                                watch.timeWindowSize && parseInt(watch.timeWindowSize, 10) === 1
                                  ? value.labelSingular
                                  : value.labelPlural,
                              value: key,
                            };
                          })}
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </div>
                </EuiPopover>
              </EuiFlexItem>
            </EuiFlexGroup>
            {hasErrors ? null : <WatchVisualization />}
            <EuiSpacer />
            <WatchActionsPanel actionErrors={actionErrors} />
            <EuiSpacer />
          </Fragment>
        ) : null}
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              type="submit"
              isDisabled={hasErrors || hasActionErrors}
              onClick={async () => {
                const savedWatch = await onWatchSave(watch, licenseService);
                if (savedWatch && savedWatch.validationError) {
                  return setModal(savedWatch.validationError);
                }
              }}
            >
              {i18n.translate('xpack.watcher.sections.watchEdit.threshold.saveButtonLabel', {
                defaultMessage: 'Save',
              })}
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
