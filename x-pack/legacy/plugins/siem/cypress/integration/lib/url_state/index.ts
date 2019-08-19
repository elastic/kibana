/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
export const ABSOLUTE_DATE_RANGE = {
  url:
    '/app/siem#/network/?_g=()&kqlQuery=(filterQuery:!n,queryLocation:network.page,type:page)&timerange=(global:(linkTo:!(timeline),timerange:(from:1564689809186,kind:absolute,to:1564691609186)),timeline:(linkTo:!(global),timerange:(from:1564689809186,kind:absolute,to:1564691609186)))',
  startTime: '1564689809186',
  endTime: '1564691609186',
  startTimeTyped: '2019-08-01 14:03:29.186',
  startTimeFormat: '2019-08-01T20:03:29.186Z',
  endTimeTyped: '2019-08-01 14:33:29.186',
  endTimeFormat: '2019-08-01T20:33:29.186Z',
  newStartTime: '1564691609186',
  newStartTimeTyped: '2019-08-01 14:33:29.186',
  newStartTimeFormat: '2019-08-01T20:33:29.186Z',
  newEndTime: '1564693409186',
  newEndTimeTyped: '2019-08-01 15:03:29.186',
  newEndTimeFormat: '2019-08-01T21:03:29.186Z',
};
export const DATE_PICKER_START_DATE_POPOVER_BUTTON =
  '[data-test-subj="superDatePickerstartDatePopoverButton"]';
export const DATE_PICKER_END_DATE_POPOVER_BUTTON =
  '[data-test-subj="superDatePickerendDatePopoverButton"]';
export const DATE_PICKER_ABSOLUTE_TAB = '[data-test-subj="superDatePickerAbsoluteTab"]';
export const DATE_PICKER_APPLY_BUTTON = 'button[data-test-subj="superDatePickerApplyTimeButton"]';
export const DATE_PICKER_ABSOLUTE_INPUT = '[data-test-subj="superDatePickerAbsoluteDateInput"]';
