/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getExperimentalAllowedValues } from '../../common/experimental_features';
import { ExperimentalFeaturesService } from './experimental_features_service';
import { getIsExperimentalFeatureEnabled } from './get_experimental_features';

const allowedExperimentalValueKeys = getExperimentalAllowedValues();

describe('getIsExperimentalFeatureEnabled', () => {
  it('getIsExperimentalFeatureEnabled returns the flag enablement', async () => {
    ExperimentalFeaturesService.init({
      experimentalFeatures: {
        rulesListDatagrid: true,
        rulesDetailLogs: true,
        stackAlertsPage: true,
        ruleTagFilter: true,
        ruleStatusFilter: true,
        ruleUseExecutionStatus: false,
        ruleKqlBar: true,
        isMustacheAutocompleteOn: false,
        showMustacheAutocompleteSwitch: false,
        isUsingRuleCreateFlyout: false,
        alertDeletionSettingsEnabled: false,
      },
    });

    let result = getIsExperimentalFeatureEnabled('rulesListDatagrid');

    expect(result).toEqual(true);

    result = getIsExperimentalFeatureEnabled('rulesDetailLogs');

    expect(result).toEqual(true);

    result = getIsExperimentalFeatureEnabled('stackAlertsPage');

    expect(result).toEqual(true);

    result = getIsExperimentalFeatureEnabled('ruleTagFilter');

    expect(result).toEqual(true);

    result = getIsExperimentalFeatureEnabled('ruleStatusFilter');

    expect(result).toEqual(true);

    result = getIsExperimentalFeatureEnabled('ruleUseExecutionStatus');

    expect(result).toEqual(false);

    result = getIsExperimentalFeatureEnabled('ruleKqlBar');

    expect(result).toEqual(true);

    result = getIsExperimentalFeatureEnabled('isMustacheAutocompleteOn');

    expect(result).toEqual(false);

    result = getIsExperimentalFeatureEnabled('showMustacheAutocompleteSwitch');

    expect(result).toEqual(false);

    result = getIsExperimentalFeatureEnabled('isUsingRuleCreateFlyout');

    expect(result).toEqual(false);

    expect(() => getIsExperimentalFeatureEnabled('doesNotExist' as any)).toThrowError(
      `Invalid enable value doesNotExist. Allowed values are: ${allowedExperimentalValueKeys.join(
        ', '
      )}`
    );
  });
});
