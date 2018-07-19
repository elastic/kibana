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

import { createTestSubjectSelectorCss } from '../../helpers/helpers';
import AdvancedSettingsPage from './advanced_settings_page';
import BasePage from '../common/base_page';
import IndexPatternPage from './index_pattern_page';
import SavedObjectsPage from './saved_objects_page';

export default class ManagementPage extends BasePage {
  constructor(driver) {
    super(driver);
    this.managementHeaderSelector = 'h2#tabHeader';
    this.indexPatternsLinkSelector = createTestSubjectSelectorCss('indices');
    this.savedObjectsLinkSelector = createTestSubjectSelectorCss('objects');
    this.advancedSettingsLinkSelector = createTestSubjectSelectorCss('settings');
    this.init();
  }

  /**
    * @function navigateToIndexPatterns
    * @returns {Object} Returns an instance of IndexPatternPage
  */
  navigateToIndexPatterns() {
    this.logger.debug('Navigating to the index pattern page.');
    this.click(this.indexPatternsLinkSelector);
    return new IndexPatternPage(this.driver);
  }

  /**
    * @function navigateToSavedObjects
    * @returns {Object} Returns an instance of SavedObjectsPage
  */
  navigateToSavedObjects() {
    this.logger.debug('Navigating to the saved objects page.');
    this.click(this.savedObjectsLinkSelector);
    return new SavedObjectsPage(this.driver);
  }

  /**
    * @function navigateToAdvancedSettings
    * @returns {Object} Returns an instance of AdvancedSettingsPage
  */
  navigateToAdvancedSettings() {
    this.logger.debug('Navigating to the advanced settings page.');
    this.click(this.advancedSettingsLinkSelector);
    return new AdvancedSettingsPage(this.driver);
  }
  init() {

  }
}
