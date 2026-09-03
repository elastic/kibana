/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isLensAPIFormat, LensConfigBuilder } from '@kbn/lens-embeddable-utils';
import type { LensApiConfig } from '@kbn/lens-embeddable-utils';
import {
  applyHouseStyle,
  type HouseStyleChange,
  type HouseStyleColors,
  type HouseStylePreserve,
  type HouseStyleRules,
} from './house_style';
import { isRecord } from './is_record';
import { stripPanelLevelKeys } from './panel_level';
import { isSupportedChartType, schemaForConfig } from './compile/chart_schemas';

export type NormalizeSkipReason =
  | 'raw_lens_attributes'
  | 'unsupported_chart_type'
  | 'conversion_failed';

export interface NormalizeSuccess {
  config: Record<string, unknown>;
  changes: HouseStyleChange[];
}

export type NormalizeResult = NormalizeSuccess | { skipped: NormalizeSkipReason };

export interface NormalizeLensPanelConfigOptions {
  rules?: HouseStyleRules;
  colors?: HouseStyleColors;
  preserve?: readonly HouseStylePreserve[];
}

const lensBuilder = new LensConfigBuilder(undefined, true);

export const normalizeLensPanelConfig = (
  panelConfig: unknown,
  options: NormalizeLensPanelConfigOptions = {}
): NormalizeResult => {
  if (!isRecord(panelConfig) || !isLensAPIFormat(panelConfig)) {
    return { skipped: 'raw_lens_attributes' };
  }
  if (!isSupportedChartType(panelConfig.type)) {
    return { skipped: 'unsupported_chart_type' };
  }

  const styled = applyHouseStyle(panelConfig, {
    chartType: panelConfig.type,
    mode: 'normalize',
    rules: options.rules ?? 'defects',
    colors: options.colors ?? 'keep',
    preserve: options.preserve,
  });

  const stripped = stripPanelLevelKeys(styled.config);
  const schema = schemaForConfig(stripped.config);
  if (!schema || !schema.safeParse(stripped.config).success) {
    return { skipped: 'conversion_failed' };
  }

  try {
    lensBuilder.fromAPIFormat(stripped.config as LensApiConfig);
  } catch {
    return { skipped: 'conversion_failed' };
  }

  return {
    config: { ...stripped.config, ...styled.panelLevel },
    changes: styled.changes,
  };
};
