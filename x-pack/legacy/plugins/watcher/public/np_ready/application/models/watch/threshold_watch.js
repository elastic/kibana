/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BaseWatch } from './base_watch';
import uuid from 'uuid';
import { WATCH_TYPES, SORT_ORDERS, COMPARATORS } from '../../../../../common/constants';
import { getTimeUnitLabel } from '../../lib/get_time_unit_label';
import { i18n } from '@kbn/i18n';
import { aggTypes } from './agg_types';
import { groupByTypes } from './group_by_types';
import { comparators } from './comparators';
const { BETWEEN } = COMPARATORS;
const DEFAULT_VALUES = {
  AGG_TYPE: 'count',
  TERM_SIZE: 5,
  THRESHOLD_COMPARATOR: COMPARATORS.GREATER_THAN,
  TIME_WINDOW_SIZE: 5,
  TIME_WINDOW_UNIT: 'm',
  TRIGGER_INTERVAL_SIZE: 1,
  TRIGGER_INTERVAL_UNIT: 'm',
  THRESHOLD: [1000, 5000],
  GROUP_BY: 'all',
};

/**
 * {@code ThresholdWatch} allows the user to create a watch by defining a threshold.
 */
export class ThresholdWatch extends BaseWatch {
  constructor(props = {}) {
    props.id = props.id || uuid.v4();
    props.type = WATCH_TYPES.THRESHOLD;
    super(props);

    this.index = props.index;
    this.timeField = props.timeField;
    this.timeFields = props.timeFields || undefined;
    this.triggerIntervalSize =
      props.triggerIntervalSize == null
        ? DEFAULT_VALUES.TRIGGER_INTERVAL_SIZE
        : props.triggerIntervalSize;
    this.triggerIntervalUnit = props.triggerIntervalUnit || DEFAULT_VALUES.TRIGGER_INTERVAL_UNIT;
    this.aggType = props.aggType || DEFAULT_VALUES.AGG_TYPE;
    this.aggField = props.aggField;
    this.termSize = props.termSize == null ? DEFAULT_VALUES.TERM_SIZE : props.termSize;
    this.termField = props.termField;
    this.thresholdComparator = props.thresholdComparator || DEFAULT_VALUES.THRESHOLD_COMPARATOR;
    this.timeWindowSize =
      props.timeWindowSize == null ? DEFAULT_VALUES.TIME_WINDOW_SIZE : props.timeWindowSize;
    this.timeWindowUnit = props.timeWindowUnit || DEFAULT_VALUES.TIME_WINDOW_UNIT;
    this.groupBy = props.groupBy || DEFAULT_VALUES.GROUP_BY;
    if (this.termField != null) {
      this.groupBy = 'top';
    }

    //NOTE: The threshold must be of the appropriate type, i.e.,number/date.
    //Conversion from string must occur by consumer when assigning a
    //value to this property.
    this.threshold = props.threshold == null ? DEFAULT_VALUES.THRESHOLD : props.threshold;
  }

  get hasTermsAgg() {
    return Boolean(this.termField);
  }

  get termOrder() {
    return this.thresholdComparator === COMPARATORS.GREATER_THAN
      ? SORT_ORDERS.DESCENDING
      : SORT_ORDERS.ASCENDING;
  }

  get titleDescription() {
    const staticPart = i18n.translate(
      'xpack.watcher.models.thresholdWatch.sendAlertOnSpecificConditionTitleDescription',
      {
        defaultMessage: 'Send an alert when your specified condition is met.',
      }
    );
    if (isNaN(this.triggerIntervalSize)) {
      return staticPart;
    }

    const timeUnitLabel = getTimeUnitLabel(this.triggerIntervalUnit, this.triggerIntervalSize);
    const dynamicPartText = i18n.translate(
      'xpack.watcher.models.thresholdWatch.thresholdWatchIntervalTitleDescription',
      {
        defaultMessage: 'Your watch will run every {triggerIntervalSize} {timeUnitLabel}.',
        values: {
          triggerIntervalSize: this.triggerIntervalSize,
          timeUnitLabel,
        },
      }
    );
    return `${staticPart} ${dynamicPartText}`;
  }
  validate() {
    const validationResult = {};
    const errors = {
      name: [],
      index: [],
      timeField: [],
      triggerIntervalSize: [],
      aggField: [],
      termSize: [],
      termField: [],
      timeWindowSize: [],
    };
    validationResult.errors = errors;
    if (!this.name) {
      errors.name.push(
        i18n.translate('xpack.watcher.sections.watchEdit.threshold.error.requiredNameText', {
          defaultMessage: 'Name is required.',
        })
      );
    }
    if (this.index !== undefined && this.index.length < 1) {
      errors.index.push(
        i18n.translate(
          'xpack.watcher.sections.watchEdit.threshold.enterOneOrMoreIndicesValidationMessage',
          {
            defaultMessage: 'Enter one or more indices.',
          }
        )
      );
    }
    if (
      this.index !== undefined &&
      this.index.length > 0 &&
      this.timeFields !== undefined &&
      this.timeFields.length === 1 // first option will have empty value
    ) {
      errors.index.push(
        i18n.translate('xpack.watcher.sections.watchEdit.threshold.invalidIndexValidationMessage', {
          defaultMessage: 'Index does not have a time field.',
        })
      );
    }
    if (!this.timeField) {
      errors.timeField.push(
        i18n.translate(
          'xpack.watcher.sections.watchEdit.threshold.timeFieldIsRequiredValidationText',
          {
            defaultMessage: 'A time field is required.',
          }
        )
      );
    }
    if (!this.triggerIntervalSize) {
      errors.triggerIntervalSize.push(
        i18n.translate(
          'xpack.watcher.sections.watchEdit.threshold.intervalSizeIsRequiredValidationMessage',
          {
            defaultMessage: 'Interval size is required.',
          }
        )
      );
    }
    if (this.triggerIntervalSize !== undefined && this.triggerIntervalSize < 0) {
      errors.triggerIntervalSize.push(
        i18n.translate(
          'xpack.watcher.sections.watchEdit.threshold.intervalSizeNegativeNumberValidationMessage',
          {
            defaultMessage: 'Interval size cannot be a negative number.',
          }
        )
      );
    }
    if (aggTypes[this.aggType].fieldRequired && !this.aggField) {
      errors.aggField.push(
        i18n.translate(
          'xpack.watcher.watchEdit.thresholdWatchExpression.aggType.fieldIsRequiredValidationMessage',
          {
            defaultMessage: 'This field is required.',
          }
        )
      );
    }
    // term field and term size only required if the group by type requires them
    if (groupByTypes[this.groupBy].sizeRequired) {
      if (!this.termSize) {
        errors.termSize.push(
          i18n.translate(
            'xpack.watcher.thresholdWatchExpression.aggType.xpack.watcher.thresholdWatchExpression.groupBy.requiredValueValidationMessage',
            {
              defaultMessage: 'A value is required.',
            }
          )
        );
      }
      if (!this.termField) {
        errors.termField.push(
          i18n.translate(
            'xpack.watcher.thresholdWatchExpression.groupBy.requiredFieldValidationMessage',
            {
              defaultMessage: 'This field is required.',
            }
          )
        );
      }
    }

    Array.from(Array(comparators[this.thresholdComparator].requiredValues)).forEach((value, i) => {
      const key = `threshold${i}`;
      errors[key] = [];
      if (this.threshold[i] == null || this.threshold[i] === '') {
        errors[key].push(
          i18n.translate(
            'xpack.watcher.thresholdWatchExpression.thresholdLevel.valueIsRequiredValidationMessage',
            {
              defaultMessage: 'A value is required.',
            }
          )
        );
      }
    });
    if (
      this.thresholdComparator === BETWEEN &&
      this.threshold[0] &&
      this.threshold[1] &&
      !(this.threshold[1] > this.threshold[0])
    ) {
      errors.threshold1.push(
        i18n.translate(
          'xpack.watcher.thresholdWatchExpression.thresholdLevel.secondValueMustBeGreaterMessage',
          {
            defaultMessage: 'Value must be greater than {lowerBound}.',
            values: {
              lowerBound: this.threshold[0],
            },
          }
        )
      );
    }
    if (!this.timeWindowSize) {
      errors.timeWindowSize.push(
        i18n.translate(
          'xpack.watcher.thresholdWatchExpression.timeWindow.durationSizeIsRequiredValidationMessage',
          {
            defaultMessage: 'Window duration size is required.',
          }
        )
      );
    }
    return validationResult;
  }
  get upstreamJson() {
    const result = super.upstreamJson;
    Object.assign(result, {
      index: this.index,
      timeField: this.timeField,
      triggerIntervalSize: this.triggerIntervalSize,
      triggerIntervalUnit: this.triggerIntervalUnit,
      aggType: this.aggType,
      aggField: this.aggField,
      termSize: this.termSize,
      termField: this.termField,
      termOrder: this.termOrder,
      thresholdComparator: this.thresholdComparator,
      timeWindowSize: this.timeWindowSize,
      timeWindowUnit: this.timeWindowUnit,
      hasTermsAgg: this.hasTermsAgg,
      threshold:
        comparators[this.thresholdComparator].requiredValues > 1
          ? this.threshold
          : this.threshold[0],
    });

    return result;
  }

  static fromUpstreamJson(upstreamWatch) {
    return new ThresholdWatch(upstreamWatch);
  }

  get DEFAULT_VALUES() {
    return DEFAULT_VALUES;
  }

  static typeName = i18n.translate('xpack.watcher.models.thresholdWatch.typeName', {
    defaultMessage: 'Threshold Alert',
  });
  static iconClass = '';
  static selectMessage = i18n.translate('xpack.watcher.models.thresholdWatch.selectMessageText', {
    defaultMessage: 'Send an alert on a specific condition',
  });
  static isCreatable = true;
  static selectSortOrder = 1;
}
