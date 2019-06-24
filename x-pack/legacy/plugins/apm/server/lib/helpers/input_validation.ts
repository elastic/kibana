/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
export const dateValidation = Joi.alternatives()
  .try(Joi.date().iso(), Joi.number())
  .required();

export const withDefaultValidators = (validators = {}) => {
  return Joi.object().keys({
    _debug: Joi.bool(),
    start: dateValidation,
    end: dateValidation,
    uiFiltersES: Joi.string(),
    ...validators
  });
};
