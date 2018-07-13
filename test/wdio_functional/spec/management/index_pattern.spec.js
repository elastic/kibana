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
import HomePage from '../../page_objects/home/home_page';

before(async function () {
  // delete .kibana index and then wait for Kibana to re-create it
  this.kibanaServer = global.getService('kibanaServer');
  await this.kibanaServer.uiSettings.replace({});
});

beforeEach(function () {
  this.logger = global.getService('log');
  this.driver = browser;
  this.driver.url('/');
  this.homePage = new HomePage(this.driver);
  this.managementPage = this.home.nav.navigateToManagement();
});

it('Create New Index Pattern Wizard', function () {
});

