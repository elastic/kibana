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

import _ from 'lodash';
import expect from 'expect.js';
import url from 'url';
import supertestAsPromised from 'supertest-as-promised';

export default function ({ getService }) {
  const es = getService('es');
  const retry = getService('retry');
  const config = getService('config');
  const testHistoryIndex = '.task_manager_test_result';
  const supertest = supertestAsPromised(url.format(config.get('servers.kibana')));

  describe('running tasks', () => {
    beforeEach(() => supertest.delete('/api/sample_tasks')
      .set('kbn-xsrf', 'xxx')
      .expect(200));

    beforeEach(async () =>
      (await es.indices.exists({ index: testHistoryIndex })) && es.deleteByQuery({
        index: testHistoryIndex,
        q: 'type:task',
        refresh: true,
      }));

    function currentTasks() {
      return supertest.get('/api/sample_tasks')
        .expect(200)
        .then((response) => response.body);
    }

    function historyDocs() {
      return es.search({
        index: testHistoryIndex,
        type: '_doc',
        q: 'type:task',
      }).then(result => result.hits.hits);
    }

    function scheduleTask(task) {
      return supertest.post('/api/sample_tasks')
        .set('kbn-xsrf', 'xxx')
        .send(task)
        .expect(200)
        .then((response) => response.body);
    }

    it('should support middleware', async () => {
      const historyItem = _.random(1, 100);

      await scheduleTask({
        taskType: 'sampleTask',
        interval: '30m',
        params: { historyItem },
      });

      await retry.try(async () => {
        expect((await historyDocs()).length).to.eql(1);

        const [task] = (await currentTasks()).docs;

        expect(task.attempts).to.eql(0);
        expect(task.state.count).to.eql(1);

        expect(task.params).to.eql({
          superFly: 'My middleware param!',
          originalParams: { historyItem },
        });
      });
    });

    it('should remove non-recurring tasks after they complete', async () => {
      await scheduleTask({
        taskType: 'sampleTask',
        params: { },
      });

      await retry.try(async () => {
        const history = await historyDocs();
        expect(history.length).to.eql(1);
        expect((await currentTasks()).docs).to.eql([]);
      });
    });

    it('should reschedule if task errors', async () => {
      const task = await scheduleTask({
        taskType: 'sampleTask',
        params: { failWith: 'Dangit!!!!!' },
      });

      await retry.try(async () => {
        const [scheduledTask] = (await currentTasks()).docs;
        expect(scheduledTask.id).to.eql(task.id);
        expect(scheduledTask.attempts).to.be.greaterThan(0);
        expect(Date.parse(scheduledTask.runAt)).to.be.greaterThan(Date.now());
      });
    });

    it('should reschedule if task returns runAt', async () => {
      const nextRunMilliseconds = _.random(60000, 200000);
      const count = _.random(1, 20);
      const buffer = 10000;

      await scheduleTask({
        taskType: 'sampleTask',
        params: { nextRunMilliseconds },
        state: { count },
      });

      retry.try(async () => {
        expect((await historyDocs()).length).to.eql(1);

        const [task] = (await currentTasks()).docs;
        expect(task.attempts).to.eql(0);
        expect(task.state.count).to.eql(count + 1);
        expect(Date.parse(task.runAt)).to.be.greaterThan(Date.now() + (nextRunMilliseconds - buffer));
        expect(Date.parse(task.runAt).getTime()).to.be.lessThan(Date.now() + nextRunMilliseconds);
      });
    });

    it('should reschedule if task has an interval', async () => {
      const interval = _.random(5, 200);
      const intervalMilliseconds = interval * 60000;
      const buffer = 10000;

      await scheduleTask({
        taskType: 'sampleTask',
        interval: `${interval}m`,
        params: { },
      });

      retry.try(async () => {
        expect((await historyDocs()).length).to.eql(1);

        const [task] = (await currentTasks()).docs;
        expect(task.attempts).to.eql(0);
        expect(task.state.count).to.eql(1);
        expect(Date.parse(task.runAt)).to.be.greaterThan(Date.now() + (intervalMilliseconds - buffer));
        expect(Date.parse(task.runAt).getTime()).to.be.lessThan(Date.now() + intervalMilliseconds);
      });
    });
  });
}
