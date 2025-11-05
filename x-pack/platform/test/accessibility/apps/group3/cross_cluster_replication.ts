/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects([
    'common',
    'settings',
    'header',
    'remoteClusters',
    'crossClusterReplication',
  ]);
  const a11y = getService('a11y');
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const es = getService('es');
  const retry = getService('retry');

  // github.com/elastic/kibana/issues/153599
  describe.skip('cross cluster replication - a11y tests', () => {
    before(async () => {
      await PageObjects.common.navigateToApp('crossClusterReplication');
    });

    describe('follower index tab', () => {
      const remoteName = `testremote${Date.now().toString()}`;
      const testIndex = `testindex${Date.now().toString()}`;
      const testFollower = `follower${Date.now().toString()}`;
      const testLeader = `leader${Date.now().toString()}`;
      const autoFollower = `autofollow${Date.now().toString()}`;
      it('empty follower index table', async () => {
        await a11y.testAppSnapshot();
      });
      describe('follower index tab', () => {
        describe('follower index form', () => {
          before(async () => {
            await PageObjects.common.navigateToApp('remoteClusters');
            await PageObjects.remoteClusters.createNewRemoteCluster(
              remoteName,
              'localhost:9300',
              false
            );
            await es.indices.create({ index: testIndex });
            await es.indices.create({ index: testLeader });
          });
          it('create follow index form', async () => {
            await PageObjects.common.navigateToApp('crossClusterReplication');
            await PageObjects.crossClusterReplication.clickCreateFollowerIndexButton();
            await a11y.testAppSnapshot();
            await PageObjects.crossClusterReplication.createFollowerIndex(
              testLeader,
              testFollower,
              false
            );
          });
          it('follower index flyout', async () => {
            await a11y.testAppSnapshot();
            await testSubjects.click('closeFlyoutButton');
            await retry.waitFor('follower index table to be visible', async () => {
              return await (await find.byCssSelector('table')).isDisplayed();
            });
          });
          it('follower index table', async () => {
            await a11y.testAppSnapshot();
          });
          after(async () => {
            await es.indices.delete({ index: testIndex });
          });
        });
      });
      describe('auto-follower patterns', () => {
        describe('auto follower index form', () => {
          before(async () => {
            await PageObjects.crossClusterReplication.clickAutoFollowerTab();
          });
          it('empty auto follower home screen', async () => {
            await a11y.testAppSnapshot();
          });
          it('auto follower index page ', async () => {
            await PageObjects.crossClusterReplication.clickAutoFollowerPatternButton();
            await a11y.testAppSnapshot();
            await PageObjects.crossClusterReplication.createAutoFollowerPattern(
              autoFollower,
              'logstash*'
            );
          });
          it('auto follower index flyout', async () => {
            await a11y.testAppSnapshot();
            await testSubjects.click('closeFlyoutButton');
            await retry.waitFor('auto follower index table to be visible', async () => {
              return await (await find.byCssSelector('table')).isDisplayed();
            });
          });
          it('auto follow index table with data', async () => {
            await a11y.testAppSnapshot();
          });
        });
      });
    });
  });
}
