/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BaseWatch } from './base_watch';
import uuid from 'uuid';
import { WATCH_TYPES, SORT_ORDERS, COMPARATORS } from 'plugins/watcher/../common/constants';
import { getTimeUnitsLabel } from 'plugins/watcher/lib/get_time_units_label';
import { i18n } from '@kbn/i18n';

const DEFAULT_VALUES = {
  AGG_TYPE: 'count',
  TERM_SIZE: 5,
  THRESHOLD_COMPARATOR: COMPARATORS.GREATER_THAN,
  TIME_WINDOW_SIZE: 5,
  TIME_WINDOW_UNIT: 'm',
  TRIGGER_INTERVAL_SIZE: 1,
  TRIGGER_INTERVAL_UNIT: 'm',
  THRESHOLD: 1000
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
    this.triggerIntervalSize = props.triggerIntervalSize || DEFAULT_VALUES.TRIGGER_INTERVAL_SIZE;
    this.triggerIntervalUnit = props.triggerIntervalUnit || DEFAULT_VALUES.TRIGGER_INTERVAL_UNIT;
    this.aggType = props.aggType || DEFAULT_VALUES.AGG_TYPE;
    this.aggField = props.aggField;
    this.termSize = props.termSize || DEFAULT_VALUES.TERM_SIZE;
    this.termField = props.termField;
    this.thresholdComparator = props.thresholdComparator || DEFAULT_VALUES.THRESHOLD_COMPARATOR;
    this.timeWindowSize = props.timeWindowSize || DEFAULT_VALUES.TIME_WINDOW_SIZE;
    this.timeWindowUnit = props.timeWindowUnit || DEFAULT_VALUES.TIME_WINDOW_UNIT;

    //NOTE: The threshold must be of the appropriate type, i.e.,number/date.
    //Conversion from string must occur by consumer when assigning a
    //value to this property.
    this.threshold = props.threshold || DEFAULT_VALUES.THRESHOLD;
  }

  get hasTermsAgg() {
    return Boolean(this.termField);
  }

  get termOrder() {
    return this.thresholdComparator === COMPARATORS.GREATER_THAN ? SORT_ORDERS.DESCENDING : SORT_ORDERS.ASCENDING;
  }

  get titleDescription() {
    const staticPart = i18n.translate('xpack.watcher.models.thresholdWatch.sendAlertOnSpecificConditionTitleDescription', {
      defaultMessage: 'Send an alert when a specific condition is met.'
    });
    if (isNaN(this.triggerIntervalSize)) {
      return staticPart;
    }

    const timeUnitLabel = getTimeUnitsLabel(this.triggerIntervalUnit, this.triggerIntervalSize);
    const dynamicPartText = i18n.translate('xpack.watcher.models.thresholdWatch.thresholdWatchIntervalTitleDescription', {
      defaultMessage: 'This will run every {triggerIntervalSize} {timeUnitLabel}.',
      values: {
        triggerIntervalSize: this.triggerIntervalSize,
        timeUnitLabel
      }
    });
    return `${staticPart} ${dynamicPartText}`;
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
      thresholdComparator: this.thresholdComparator,
      timeWindowSize: this.timeWindowSize,
      timeWindowUnit: this.timeWindowUnit,
      threshold: this.threshold
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
    defaultMessage: 'Threshold Alert'
  });
  static iconClass = '';
  static selectMessage = i18n.translate('xpack.watcher.models.thresholdWatch.selectMessageText', {
    defaultMessage: 'Send an alert on a specific condition'
  });
  static isCreatable = true;
  static selectSortOrder = 1;
}
