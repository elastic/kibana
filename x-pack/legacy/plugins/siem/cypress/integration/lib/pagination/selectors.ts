/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const AUTHENTICATIONS_TABLE = '[data-test-subj="table-authentications-loading-false"]';
export const FIVE_ROWS = '[data-test-subj=loadingMorePickSizeRow] button:first';
export const getDraggableField = (field: string) => `[data-test-subj="draggable-content-${field}"]`;
export const getPageButtonSelector = (num: number) => `[data-test-subj="pagination-button-${num}"]`;
export const NAVIGATION_AUTHENTICATIONS = '[data-test-subj="navigation-authentications"]';
export const NAVIGATION_UNCOMMON_PROCESSES = '[data-test-subj="navigation-uncommonProcesses"]';
export const NUMBERED_PAGINATION = '[data-test-subj="numberedPagination"]';
export const ROWS_PER_PAGE = '[data-test-subj="rowsPerPage"]';
export const SUPER_DATE_PICKER_APPLY_BUTTON = '[data-test-subj="superDatePickerApplyTimeButton"]';
export const UNCOMMON_PROCESSES_TABLE = '[data-test-subj="table-uncommonProcesses-loading-false"]';
