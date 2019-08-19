/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
export const ABSOLUTE_DATE_RANGE = {
  url:
    '/app/siem#/network/?_g=()&kqlQuery=(filterQuery:!n,queryLocation:network.page,type:page)&timerange=(global:(linkTo:!(timeline),timerange:(from:1564689809186,kind:absolute,to:1564691609186)),timeline:(linkTo:!(global),timerange:(from:1564689809186,kind:absolute,to:1564691609186)))',

  urlUnlinked:
    '/app/siem#/network/?_g=()&kqlQuery=(filterQuery:!n,queryLocation:network.page,type:page)&timerange=(global:(linkTo:!(),timerange:(from:1564689809186,kind:absolute,to:1564691609186)),timeline:(linkTo:!(),timerange:(from:1564776209186,kind:absolute,to:1564779809186)))',
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
  startTimeTimeline: '1564776209186',
  endTimeTimeline: '1564779809186',
  startTimeTypedTimeline: '2019-08-02 14:03:29.186',
  startTimeFormatTimeline: '2019-08-02T20:03:29.186Z',
  endTimeTypedTimeline: '2019-08-02 21:03:29.186',
  endTimeFormatTimeline: '2019-08-02T21:03:29.186Z',
};
export const DATE_PICKER_START_DATE_POPOVER_BUTTON =
  '[data-test-subj="globalDatePicker"] [data-test-subj="superDatePickerstartDatePopoverButton"]';
export const DATE_PICKER_END_DATE_POPOVER_BUTTON =
  '[data-test-subj="globalDatePicker"] [data-test-subj="superDatePickerendDatePopoverButton"]';
export const DATE_PICKER_START_DATE_POPOVER_BUTTON_TIMELINE =
  '[data-test-subj="timeline-properties"] [data-test-subj="superDatePickerstartDatePopoverButton"]';
export const DATE_PICKER_END_DATE_POPOVER_BUTTON_TIMELINE =
  '[data-test-subj="timeline-properties"] [data-test-subj="superDatePickerendDatePopoverButton"]';
export const DATE_PICKER_ABSOLUTE_TAB = '[data-test-subj="superDatePickerAbsoluteTab"]';
export const DATE_PICKER_APPLY_BUTTON =
  '[data-test-subj="globalDatePicker"] button[data-test-subj="superDatePickerApplyTimeButton"]';
export const DATE_PICKER_ABSOLUTE_INPUT = '[data-test-subj="superDatePickerAbsoluteDateInput"]';
