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

export default function ({ getService }) {
  const es = getService('es');
  const supertest = getService('supertest');
  const retry = getService('retry');
  const testHistoryIndex = '.task_manager_test_result';

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

    it('should remove non-recurring tasks after they complete', async () => {
      await scheduleTask({
        taskType: 'simpleTask',
        params: { },
      });

      await retry.try(async () => {
        const history = await historyDocs();
        expect(history.length).to.eql(1);
        expect((await currentTasks()).docs).to.eql([]);
      });
    });

    it('should reschedule if task errors', async () => {
      await scheduleTask({
        taskType: 'simpleTask',
        params: { failWith: 'Dangit!!!!!' },
      });

      await retry.try(async () => {
        const [task] = (await currentTasks()).docs;
        expect(task.attempts).to.be.greaterThan(0);
        expect(Date.parse(task.runAt)).to.be.greaterThan(new Date());
      });
    });

    it('should reschedule if task returns runAt', async () => {
      const nextRunMilliseconds = _.random(60000, 200000);
      const count = _.random(1, 20);
      const buffer = 10000;

      await scheduleTask({
        taskType: 'simpleTask',
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
        taskType: 'simpleTask',
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

    it('should support middleware', async () => {
      const historyItem = _.random(1, 100);

      await scheduleTask({
        taskType: 'simpleTask',
        params: { historyItem },
      });

      await retry.try(async () => {
        const history = await historyDocs();
        expect(JSON.parse(history[0]._source.params)).to.eql({
          superFly: 'My middleware param!',
          originalParams: { historyItem },
        });
      });
    });
  });
}
