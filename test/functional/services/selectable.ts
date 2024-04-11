/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrService } from '../ftr_provider_context';

/**
 * Wrapper around EuiSelectable to provide abstraction for selecting options
 *
 * @example
 * ```tsx
 *   const button = (
 *     <EuiFilterButton data-test-subj="buttonTestId"
 *       ... other
 *     >
 *       {label}
 *     </EuiFilterButton>
 *   );
 *
 *   <EuiPopover button={button} ... >
 *    <EuiSelectable data-test-subj="selectableTestId"
 *      ... other
 *     >
 *      {listOptions}
 *    </EuiSelectable>
 *   </EuiEuiPopover>
 * ```
 *
 *  // Select only options with text 'option1' and 'option2'
 * ```typescript
 *  await selectableService.selectOnlyOptionsWithText('buttonTestId', 'selectableTestId', ['option1', 'option2']);
 *  ```
 */
export class SelectableService extends FtrService {
  private readonly log = this.ctx.getService('log');
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly common = this.ctx.getPageObject('common');

  public async selectOnlyOptionsWithText(
    buttonTestSubjectId: string,
    selectableBodyTestSubjectId: string,
    textsToSelect: string[]
  ) {
    this.log.debug(
      `Selectable.selectOnlyOptionsWithText, buttonTestSubjectId: ${buttonTestSubjectId},` +
        `selectableBodyTestSubjectId: ${selectableBodyTestSubjectId}, textsToSelect: ${textsToSelect}`
    );

    // Open the selectable
    await this.testSubjects.click(buttonTestSubjectId);
    await this.common.sleep(500);

    const selectableBodyContainer = await this.testSubjects.find(selectableBodyTestSubjectId);
    const listContainer = await selectableBodyContainer.findByClassName('euiSelectableList');
    const optionListElements = await listContainer.findAllByCssSelector('li[role="option"]');

    for (let i = 0; i < optionListElements.length; i++) {
      const option = optionListElements[i];
      const isSelected = (await option.getAttribute('aria-checked')) === 'true';
      const textWrapper = await option.findByClassName('euiSelectableListItem__text');

      // Use innerText as getVisibleText doesn't return deeply nested text
      const innerText = (await textWrapper.getAttribute('innerText')) ?? '';

      // Replace screen reader and other Eui related text
      const visibleText = innerText
        .replace(screenReaderOptionText, '')
        .replace('\n.', '')
        .replace('.\n', '')
        .trim();
      const doesOptionTextMatch = textsToSelect.some((text) => text === visibleText);

      if ((doesOptionTextMatch && !isSelected) || (!doesOptionTextMatch && isSelected)) {
        await option.click();
      }
    }

    // Close selectable
    return this.testSubjects.click(buttonTestSubjectId);
  }

  public async clearSelection(buttonTestSubjectId: string, selectableBodyTestSubjectId: string) {
    return this.selectOnlyOptionsWithText(buttonTestSubjectId, selectableBodyTestSubjectId, []);
  }
}

const screenReaderOptionText = 'To check this option, press Enter.';
