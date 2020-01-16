/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { createSelector } from 'reselect';
import { State } from '../reducer';
import { CasePageModel } from '../case/model';

const selectCasePage = (state: State): CasePageModel => state.case.page;
export const casesSelector = () =>
  createSelector(selectCasePage, casePage => casePage.queries.cases);
