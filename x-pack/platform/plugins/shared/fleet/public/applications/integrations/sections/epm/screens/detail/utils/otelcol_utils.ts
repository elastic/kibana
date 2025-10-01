/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { OTEL_COLLECTOR_INPUT_TYPE } from '../../../../../../../../common/constants';
import { ExperimentalFeaturesService } from '../../../../../services';
import type { PackageInfo } from '../../../../../types';

export const isOtelInputPackage = (packageInfo: PackageInfo | undefined) => {
  const { enableOtelIntegrations } = ExperimentalFeaturesService.get();

  const isOtelInput = (packageInfo?.policy_templates || []).some(
    (template) => template.input === OTEL_COLLECTOR_INPUT_TYPE
  );
  return enableOtelIntegrations && isOtelInput;
};
