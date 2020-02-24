/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObject, SavedObjectsFindResponse } from 'kibana/server';
import { fold } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import * as t from 'io-ts';

import { PartialAlert, FindResult } from '../../../../../../../../plugins/alerting/server';
import { formatErrors } from '../schemas/response/utils';
import {
  isAlertType,
  IRuleSavedAttributesSavedObjectAttributes,
  isRuleStatusFindType,
} from '../../rules/types';
import { OutputRuleAlertRest } from '../../types';
import { createBulkErrorObject, BulkError } from '../utils';
import { rulesSchema } from '../schemas/response/rules_schema';
import { exactCheck } from '../schemas/response/exact_check';
import {
  PrePackagedRulesSchema,
  prePackagedRulesSchema,
} from '../schemas/response/prepackaged_rules_schema';
import { findRulesSchema } from '../schemas/response/find_rules_schema';
import { rulesBulkSchema } from '../schemas/response/rules_bulk_schema';
import {
  prePackagedRulesStatusSchema,
  PrePackagedRulesStatusSchema,
} from '../schemas/response/prepackaged_rules_status_schema';
import { importRulesSchema, ImportRulesSchema } from '../schemas/response/import_rules_schema';
import { transformFindAlerts, transform, transformAlertToRule } from './utils';

export const transformValidateFindAlerts = (
  findResults: FindResult,
  ruleStatuses?: Array<SavedObjectsFindResponse<IRuleSavedAttributesSavedObjectAttributes>>
): {
  errors: string | null;
  transformed: {
    page: number;
    perPage: number;
    total: number;
    data: Array<Partial<OutputRuleAlertRest>>;
  } | null;
} => {
  const transformed = transformFindAlerts(findResults, ruleStatuses);
  if (transformed == null) {
    return {
      errors: 'unknown data type, error transforming alert',
      transformed: null,
    };
  } else {
    const decoded = findRulesSchema.decode(transformed);
    const checked = exactCheck(findResults, decoded);
    const left = (errors: t.Errors): string[] => formatErrors(errors);
    const right = (): string[] => [];
    const piped = pipe(checked, fold(left, right));
    if (piped.length === 0) {
      return { errors: null, transformed };
    } else {
      return { errors: piped.join(','), transformed: null };
    }
  }
};

export const transformValidate = (
  alert: PartialAlert,
  ruleStatus?: SavedObject<IRuleSavedAttributesSavedObjectAttributes>
): { errors: string | null; transformed: Partial<OutputRuleAlertRest> | null } => {
  const transformed = transform(alert, ruleStatus);
  if (transformed == null) {
    return { errors: 'Internal error transforming rules', transformed: null };
  } else {
    const errors = validateRuleResponse(transformed);
    if (errors.length !== 0) {
      return { errors: errors.join(','), transformed: null };
    } else {
      return { errors: null, transformed };
    }
  }
};

export const transformValidateBulkError = (
  ruleId: string,
  alert: PartialAlert,
  ruleStatus?: unknown
): Partial<OutputRuleAlertRest> | BulkError => {
  if (isAlertType(alert)) {
    if (isRuleStatusFindType(ruleStatus)) {
      const transformed = transformAlertToRule(alert, ruleStatus?.saved_objects[0] ?? ruleStatus);
      const errors = validateRuleResponse(transformed);
      if (errors.length !== 0) {
        return createBulkErrorObject({
          ruleId,
          statusCode: 500,
          message: errors.join(','),
        });
      } else {
        return transformed;
      }
    } else {
      const transformed = transformAlertToRule(alert);
      const errors = validateRuleResponse(transformed);
      if (errors.length !== 0) {
        return createBulkErrorObject({
          ruleId,
          statusCode: 500,
          message: errors.join(','),
        });
      } else {
        return transformed;
      }
    }
  } else {
    return createBulkErrorObject({
      ruleId,
      statusCode: 500,
      message: 'Internal error transforming',
    });
  }
};

/**
 * Validates and returns any errors as a string array. We don't return the
 * right decoded at the moment. Rather we just use this system for validation
 * checks and only return errors if we find errors.
 * @param rule The rule to validate (as an object) since we don't know what it is.
 */
export const validateRuleResponse = (rule: object): string[] => {
  const decoded = rulesSchema.decode(rule);
  const checked = exactCheck(rule, decoded);
  const left = (errors: t.Errors): string[] => formatErrors(errors);
  const right = (): string[] => [];
  return pipe(checked, fold(left, right));
};

/**
 * Validates and returns any errors as a string array.
 * @param rule The rule to validate (as an object) since we don't know what it is.
 */
export const validateRuleResponses = (rules: object[]): string[] => {
  return rules.map(rule => validateRuleResponse(rule)).flat();
};

export const validateAddPrePackagedRules = (
  prepackagedRules: PrePackagedRulesSchema
): { errors: string | null; transformed: PrePackagedRulesSchema | null } => {
  const decoded = prePackagedRulesSchema.decode(prepackagedRules);
  const checked = exactCheck(prepackagedRules, decoded);
  const left = (errors: t.Errors): string[] => formatErrors(errors);
  const right = (): string[] => [];
  const piped = pipe(checked, fold(left, right));
  if (piped.length === 0) {
    return { errors: null, transformed: prepackagedRules };
  } else {
    return { errors: piped.join(','), transformed: null };
  }
};

export const validateRulesBulkSchema = (
  rulesBulk: Array<BulkError | Partial<OutputRuleAlertRest>>
): {
  errors: string | null;
  transformed: Array<BulkError | Partial<OutputRuleAlertRest>> | null;
} => {
  const decoded = rulesBulkSchema.decode(rulesBulk);
  const checked = exactCheck(rulesBulk, decoded);
  const left = (errors: t.Errors): string[] => formatErrors(errors);
  const right = (): string[] => [];
  const piped = pipe(checked, fold(left, right));
  if (piped.length === 0) {
    return { errors: null, transformed: rulesBulk };
  } else {
    return { errors: piped.join(','), transformed: null };
  }
};

export const validateAddPrePackagedRulesStatus = (
  prepackagedRulesStatus: PrePackagedRulesStatusSchema
): { errors: string | null; transformed: PrePackagedRulesStatusSchema | null } => {
  const decoded = prePackagedRulesStatusSchema.decode(prepackagedRulesStatus);
  const checked = exactCheck(prepackagedRulesStatus, decoded);
  const left = (errors: t.Errors): string[] => formatErrors(errors);
  const right = (): string[] => [];
  const piped = pipe(checked, fold(left, right));
  if (piped.length === 0) {
    return { errors: null, transformed: prepackagedRulesStatus };
  } else {
    return { errors: piped.join(','), transformed: null };
  }
};

export const validateImportRules = (
  importRules: ImportRulesSchema
): { errors: string | null; transformed: ImportRulesSchema | null } => {
  const decoded = importRulesSchema.decode(importRules);
  const checked = exactCheck(importRules, decoded);
  const left = (errors: t.Errors): string[] => formatErrors(errors);
  const right = (): string[] => [];
  const piped = pipe(checked, fold(left, right));
  if (piped.length === 0) {
    return { errors: null, transformed: importRules };
  } else {
    return { errors: piped.join(','), transformed: null };
  }
};
