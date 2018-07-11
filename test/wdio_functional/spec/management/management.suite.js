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




describe('Management App', function () {
  before(async function () {
    try {
      this.esArchiver = await global.getService('esArchiver');
      this.logger = await global.getService('log');
      this.logger.info('Loading makelogs data');
      this.logger.debug('Unloading logstash_functional');
      await this.esArchiver.unload('logstash_functional');
      this.logger.debug('Loading empty kibana');
      await this.esArchiver.load('empty_kibana');
      this.logger.debug('Loading make logs if necessary.');
      await this.esArchiver.loadIfNeeded('makelogs');
      this.logger.debug('Data Loaded');
    } catch (e) {
      this.logger.error('Data load failed.');
      this.logger.error(e);
    }
  });

  describe('Index Pattern Tests', function () {
    require('./index_pattern.spec');
  });

  after(async function () {
    this.logger.info('Unloading makelogs data');
    await this.esArchiver.unload('makelogs');
    this.logger.debug('Loading empty kibana');
    await this.esArchiver.unload('empty_kibana');
  });

});