/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { SwimlaneConnectorType, SwimlaneMappingConfig, MappingConfigurationKeys } from './types';
import * as i18n from './translations';

const casesRequiredFields: MappingConfigurationKeys[] = [
  'caseNameConfig',
  'descriptionConfig',
  'commentsConfig',
  'caseIdConfig',
];
const casesFields = [...casesRequiredFields];
const alertsRequiredFields: MappingConfigurationKeys[] = ['ruleNameConfig', 'alertIdConfig'];
const alertsFields = ['severityConfig', 'commentsConfig', ...alertsRequiredFields];

export const translationMapping: Record<string, string> = {
  caseIdConfig: i18n.SW_REQUIRED_CASE_ID,
  alertIdConfig: i18n.SW_REQUIRED_ALERT_ID,
  caseNameConfig: i18n.SW_REQUIRED_CASE_NAME,
  descriptionConfig: i18n.SW_REQUIRED_DESCRIPTION,
  commentsConfig: i18n.SW_REQUIRED_COMMENTS,
  ruleNameConfig: i18n.SW_REQUIRED_RULE_NAME,
  severityConfig: i18n.SW_REQUIRED_SEVERITY,
};

export const isValidFieldForConnector = (
  connectorType: SwimlaneConnectorType,
  fieldId: MappingConfigurationKeys
): boolean => {
  if (connectorType === SwimlaneConnectorType.All) {
    return true;
  }

  return connectorType === SwimlaneConnectorType.Alerts
    ? alertsFields.includes(fieldId)
    : casesFields.includes(fieldId);
};

export const isRequiredField = (
  connectorType: SwimlaneConnectorType,
  fieldId: MappingConfigurationKeys | undefined
) => {
  if (connectorType === SwimlaneConnectorType.All) {
    return false;
  }

  if (fieldId == null || isEmpty(fieldId)) {
    return true;
  }

  return connectorType === SwimlaneConnectorType.Alerts
    ? alertsFields.includes(fieldId)
    : casesFields.includes(fieldId);
};

export const validateMappingForConnector = (
  connectorType: SwimlaneConnectorType,
  mapping: SwimlaneMappingConfig
): Record<string, string> => {
  if (connectorType === SwimlaneConnectorType.All || connectorType == null) {
    return {};
  }

  const requiredFields =
    connectorType === SwimlaneConnectorType.Alerts ? alertsRequiredFields : casesRequiredFields;

  return requiredFields.reduce((errors, field) => {
    if (mapping?.[field] == null) {
      errors = { ...errors, [field]: translationMapping[field] };
    }

    return errors;
  }, {} as Record<string, string>);
};
