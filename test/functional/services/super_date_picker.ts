/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

export function SuperDatePickerProvider({ getService }: any) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  return new class SuperDatePicker {
    /**
     * Open the superDatePicker, navigate to the absolute tab, set the
     * date to the passed string, and close the superDatePicker
     */
    public async setAbsoluteStart(date: string) {
      await this.ensureStartDateOpen();
      try {
        await testSubjects.click('superDatePickerAbsoluteTab');
        await testSubjects.setValue('superDatePickerAbsoluteDateInput', date);
      } finally {
        await this.ensureStartDateClosed();
      }
    }

    /**
     * Click the superDatePickerstartDatePopoverButton toggle until the
     * euiDatePopover is visible. It might be open before clicking the button
     * because the same component and test subject are used for the start and
     * end date so we just click the start button until the popover is visible
     */
    private async ensureStartDateOpen() {
      await this.ensureDatesShown();
      await retry.try(async () => {
        await testSubjects.click('superDatePickerstartDatePopoverButton');
        await retry.waitFor(
          'superDatePicker popover open',
          async () => await testSubjects.exists('superDatePickerAbsoluteTab')
        );
      });
    }

    /**
     * Click the superDatePickerstartDatePopoverButton toggle until the
     * euiDatePopover goes away. It might be open for the start or end date
     * so we can't be super precise here, but in most cases the first click
     * will hide the popover
     */
    private async ensureStartDateClosed() {
      await this.ensureDatesShown();
      await retry.try(async () => {
        await testSubjects.click('superDatePickerstartDatePopoverButton');
        await retry.waitFor(
          'superDatePicker popover closed',
          async () => !(await testSubjects.exists('superDatePickerAbsoluteTab'))
        );
      });
    }

    private async ensureDatesShown() {
      if (await testSubjects.exists('superDatePickerShowDatesButton')) {
        await testSubjects.click('superDatePickerShowDatesButton');
        await retry.waitFor(
          'superDatePicker dates to be shown',
          async () => await testSubjects.exists('superDatePickerstartDatePopoverButton')
        );
      }
    }
  }();
}
