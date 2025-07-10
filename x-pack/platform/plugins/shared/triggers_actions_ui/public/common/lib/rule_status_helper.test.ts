/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRuleHealthColor, getRuleStatusMessage } from './rule_status_helpers';
import type { EuiThemeComputed } from '@elastic/eui';
import type { RuleTableItem } from '../../types';

import { getIsExperimentalFeatureEnabled } from '../get_experimental_features';
import {
  ALERT_STATUS_LICENSE_ERROR,
  rulesLastRunOutcomeTranslationMapping,
  rulesStatusesTranslationsMapping,
} from '../../application/sections/rules_list/translations';

jest.mock('../get_experimental_features', () => ({
  getIsExperimentalFeatureEnabled: jest.fn(),
}));

const mockTheme = {
  colors: {
    success: '008A5E',
    warning: '#FACB3D',
    danger: '#C61E25',
    primary: '#0B64DD',
    accent: '#BC1E70',
  },
} as EuiThemeComputed;

const mockRule = {
  id: '1',
  enabled: true,
  executionStatus: {
    status: 'active',
  },
  lastRun: {
    outcome: 'succeeded',
  },
} as RuleTableItem;

const warningRule = {
  ...mockRule,
  executionStatus: {
    status: 'warning',
  },
  lastRun: {
    outcome: 'warning',
  },
} as RuleTableItem;

const failedRule = {
  ...mockRule,
  executionStatus: {
    status: 'error',
  },
  lastRun: {
    outcome: 'failed',
  },
} as RuleTableItem;

const licenseErrorRule = {
  ...mockRule,
  executionStatus: {
    status: 'error',
    error: {
      reason: 'license',
    },
  },
  lastRun: {
    outcome: 'failed',
    warning: 'license',
  },
} as RuleTableItem;

beforeEach(() => {
  (getIsExperimentalFeatureEnabled as jest.Mock<any, any>).mockImplementation(() => false);
});

describe('getRuleHealthColor', () => {
  it('should return the correct color for successful rule', () => {
    let color = getRuleHealthColor(mockRule, mockTheme);
    expect(color).toEqual(mockTheme.colors.success);

    (getIsExperimentalFeatureEnabled as jest.Mock<any, any>).mockImplementation(() => true);

    color = getRuleHealthColor(mockRule, mockTheme);
    expect(color).toEqual(mockTheme.colors.success);
  });

  it('should return the correct color for warning rule', () => {
    let color = getRuleHealthColor(warningRule, mockTheme);
    expect(color).toEqual(mockTheme.colors.warning);

    (getIsExperimentalFeatureEnabled as jest.Mock<any, any>).mockImplementation(() => true);

    color = getRuleHealthColor(warningRule, mockTheme);
    expect(color).toEqual(mockTheme.colors.warning);
  });

  it('should return the correct color for failed rule', () => {
    let color = getRuleHealthColor(failedRule, mockTheme);
    expect(color).toEqual(mockTheme.colors.danger);

    (getIsExperimentalFeatureEnabled as jest.Mock<any, any>).mockImplementation(() => true);

    color = getRuleHealthColor(failedRule, mockTheme);
    expect(color).toEqual(mockTheme.colors.danger);
  });
});

describe('getRuleStatusMessage', () => {
  it('should get the status message for a successful rule', () => {
    let statusMessage = getRuleStatusMessage({
      rule: mockRule,
      licenseErrorText: ALERT_STATUS_LICENSE_ERROR,
      lastOutcomeTranslations: rulesLastRunOutcomeTranslationMapping,
      executionStatusTranslations: rulesStatusesTranslationsMapping,
    });
    expect(statusMessage).toEqual('Succeeded');

    (getIsExperimentalFeatureEnabled as jest.Mock<any, any>).mockImplementation(() => true);
    statusMessage = getRuleStatusMessage({
      rule: mockRule,
      licenseErrorText: ALERT_STATUS_LICENSE_ERROR,
      lastOutcomeTranslations: rulesLastRunOutcomeTranslationMapping,
      executionStatusTranslations: rulesStatusesTranslationsMapping,
    });
    expect(statusMessage).toEqual('Active');
  });

  it('should get the status message for a warning rule', () => {
    let statusMessage = getRuleStatusMessage({
      rule: warningRule,
      licenseErrorText: ALERT_STATUS_LICENSE_ERROR,
      lastOutcomeTranslations: rulesLastRunOutcomeTranslationMapping,
      executionStatusTranslations: rulesStatusesTranslationsMapping,
    });
    expect(statusMessage).toEqual('Warning');

    (getIsExperimentalFeatureEnabled as jest.Mock<any, any>).mockImplementation(() => true);
    statusMessage = getRuleStatusMessage({
      rule: warningRule,
      licenseErrorText: ALERT_STATUS_LICENSE_ERROR,
      lastOutcomeTranslations: rulesLastRunOutcomeTranslationMapping,
      executionStatusTranslations: rulesStatusesTranslationsMapping,
    });
    expect(statusMessage).toEqual('Warning');
  });

  it('should get the status message for a failed rule', () => {
    let statusMessage = getRuleStatusMessage({
      rule: failedRule,
      licenseErrorText: ALERT_STATUS_LICENSE_ERROR,
      lastOutcomeTranslations: rulesLastRunOutcomeTranslationMapping,
      executionStatusTranslations: rulesStatusesTranslationsMapping,
    });
    expect(statusMessage).toEqual('Failed');

    (getIsExperimentalFeatureEnabled as jest.Mock<any, any>).mockImplementation(() => true);
    statusMessage = getRuleStatusMessage({
      rule: failedRule,
      licenseErrorText: ALERT_STATUS_LICENSE_ERROR,
      lastOutcomeTranslations: rulesLastRunOutcomeTranslationMapping,
      executionStatusTranslations: rulesStatusesTranslationsMapping,
    });
    expect(statusMessage).toEqual('Error');
  });

  it('should get the status message for a license error rule', () => {
    let statusMessage = getRuleStatusMessage({
      rule: licenseErrorRule,
      licenseErrorText: ALERT_STATUS_LICENSE_ERROR,
      lastOutcomeTranslations: rulesLastRunOutcomeTranslationMapping,
      executionStatusTranslations: rulesStatusesTranslationsMapping,
    });
    expect(statusMessage).toEqual('License Error');

    (getIsExperimentalFeatureEnabled as jest.Mock<any, any>).mockImplementation(() => true);
    statusMessage = getRuleStatusMessage({
      rule: licenseErrorRule,
      licenseErrorText: ALERT_STATUS_LICENSE_ERROR,
      lastOutcomeTranslations: rulesLastRunOutcomeTranslationMapping,
      executionStatusTranslations: rulesStatusesTranslationsMapping,
    });
    expect(statusMessage).toEqual('License Error');
  });
});
