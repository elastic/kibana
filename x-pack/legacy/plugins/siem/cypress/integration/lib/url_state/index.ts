/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
export const ABSOLUTE_DATE_RANGE = {
  endTime: '1564691609186',
  endTimeFormat: '2019-08-01T20:33:29.186Z',
  endTimeTimeline: '1564779809186',
  endTimeTimelineFormat: '2019-08-02T21:03:29.186Z',
  endTimeTimelineTyped: '2019-08-02 21:03:29.186',
  endTimeTyped: '2019-08-01 14:33:29.186',
  newEndTime: '1564693409186',
  newEndTimeFormat: '2019-08-01T21:03:29.186Z',
  newEndTimeTyped: '2019-08-01 15:03:29.186',
  newStartTime: '1564691609186',
  newStartTimeFormat: '2019-08-01T20:33:29.186Z',
  newStartTimeTyped: '2019-08-01 14:33:29.186',
  startTime: '1564689809186',
  startTimeFormat: '2019-08-01T20:03:29.186Z',
  startTimeTimeline: '1564776209186',
  startTimeTimelineFormat: '2019-08-02T20:03:29.186Z',
  startTimeTimelineTyped: '2019-08-02 14:03:29.186',
  startTimeTyped: '2019-08-01 14:03:29.186',
  url:
    '/app/siem#/network/?_g=()&kqlQuery=(filterQuery:!n,queryLocation:network.page,type:page)&timerange=(global:(linkTo:!(timeline),timerange:(from:1564689809186,kind:absolute,to:1564691609186)),timeline:(linkTo:!(global),timerange:(from:1564689809186,kind:absolute,to:1564691609186)))',

  urlUnlinked:
    '/app/siem#/network/?_g=()&kqlQuery=(filterQuery:!n,queryLocation:network.page,type:page)&timerange=(global:(linkTo:!(),timerange:(from:1564689809186,kind:absolute,to:1564691609186)),timeline:(linkTo:!(),timerange:(from:1564776209186,kind:absolute,to:1564779809186)))',
  urlKqlNetworkNetwork: `/app/siem#/network/?_g=()&kqlQuery=(filterQuery:(expression:'source.ip:%20"10.142.0.9"',kind:kuery),queryLocation:network.page,type:page)&timerange=(global:(linkTo:!(timeline),timerange:(from:1564689809186,kind:absolute,to:1564691609186)),timeline:(linkTo:!(global),timerange:(from:1564689809186,kind:absolute,to:1564691609186)))`,
  urlKqlNetworkHosts: `/app/siem#/network/?_g=()&kqlQuery=(filterQuery:(expression:'source.ip:%20"10.142.0.9"',kind:kuery),queryLocation:hosts.page,type:page)&timerange=(global:(linkTo:!(timeline),timerange:(from:1564689809186,kind:absolute,to:1564691609186)),timeline:(linkTo:!(global),timerange:(from:1564689809186,kind:absolute,to:1564691609186)))`,
  urlKqlHostsNetwork: `/app/siem#/hosts/?_g=()&kqlQuery=(filterQuery:(expression:'source.ip:%20"10.142.0.9"',kind:kuery),queryLocation:network.page,type:page)&timerange=(global:(linkTo:!(timeline),timerange:(from:1564689809186,kind:absolute,to:1564691609186)),timeline:(linkTo:!(global),timerange:(from:1564689809186,kind:absolute,to:1564691609186)))`,
  urlKqlHostsHosts: `/app/siem#/hosts/?_g=()&kqlQuery=(filterQuery:(expression:'source.ip:%20"10.142.0.9"',kind:kuery),queryLocation:hosts.page,type:page)&timerange=(global:(linkTo:!(timeline),timerange:(from:1564689809186,kind:absolute,to:1564691609186)),timeline:(linkTo:!(global),timerange:(from:1564689809186,kind:absolute,to:1564691609186)))`,
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
export const DATE_PICKER_APPLY_BUTTON_TIMELINE =
  '[data-test-subj="timeline-properties"] button[data-test-subj="superDatePickerApplyTimeButton"]';
export const DATE_PICKER_ABSOLUTE_INPUT = '[data-test-subj="superDatePickerAbsoluteDateInput"]';
export const KQL_INPUT = '[data-test-subj="kqlInput"]';
