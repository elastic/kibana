/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTemplateFormMenu } from './header_menu';
import * as i18n from '../translations';

const getMenu = ({
  hasYamlValidationErrors = false,
  metadataErrors = {},
}: {
  hasYamlValidationErrors?: boolean;
  metadataErrors?: { name?: string; description?: string; tags?: string };
} = {}) =>
  getTemplateFormMenu({
    hasChanges: false,
    hasYamlValidationErrors,
    metadataErrors,
    isEdit: false,
    isEnabled: true,
    submitError: null,
    onReset: jest.fn(),
    onSave: jest.fn(),
    onIsEnabledChange: jest.fn(),
  });

describe('getTemplateFormMenu', () => {
  it.each([
    [{ name: i18n.TEMPLATE_NAME_REQUIRED }, false, i18n.PROVIDE_TEMPLATE_NAME],
    [{}, true, i18n.FIX_FIELDS_YAML_ERRORS],
    [{ name: i18n.TEMPLATE_NAME_REQUIRED }, true, i18n.FIX_FIELDS_YAML_AND_TEMPLATE_NAME],
    [{ tags: 'Tag is too long.' }, false, i18n.FIX_CONFIGURATION_ERRORS],
  ])(
    'disables saving and identifies where to fix validation errors',
    (metadataErrors, hasYamlValidationErrors, expectedTooltipContent) => {
      const menu = getMenu({ metadataErrors, hasYamlValidationErrors });
      const { primaryActionItem } = menu;

      if (primaryActionItem == null) {
        throw new Error('Expected a primary template save action.');
      }

      expect(primaryActionItem.disableButton).toBe(true);
      expect(primaryActionItem.tooltipContent).toBe(expectedTooltipContent);
    }
  );

  it('leaves saving enabled when YAML and Configuration are valid', () => {
    const menu = getMenu();
    const { primaryActionItem } = menu;

    if (primaryActionItem == null) {
      throw new Error('Expected a primary template save action.');
    }

    expect(primaryActionItem.disableButton).toBe(false);
    expect(primaryActionItem.tooltipContent).toBeUndefined();
  });
});
