
import expect from 'expect.js';

import {
  bdd
} from '../../../support';

import PageObjects from '../../../support/page_objects';

bdd.describe('secure roles permissions', async function () {

  bdd.before(async function () {
    PageObjects.common.debug('users');
    this.remote.setWindowSize(1400,800);
    await PageObjects.settings.navigateTo();
    await PageObjects.security.clickElasticsearchUsers();
    await PageObjects.security.addUser({ username: 'rashmi', password: 'changeme',
      confirmPassword: 'changeme', fullname: 'RashmiFirst RashmiLast',
      email: 'rashmi@myEmail.com', save: true, roles: ['kibana_user', 'logstash_reader', 'beats_reader'] });
    await PageObjects.shield.logoutLogin('rashmi', 'changeme');
  });

  // Verify the Access Denied message is displayed
  bdd.it('Kibana User navigating to Monitoring gets Access Denied', async function () {
    const expectedMessage = 'Access Denied';
    await PageObjects.common.navigateToApp('monitoring');
    const actualMessage = await PageObjects.monitoring.getAccessDeniedMessage();
    expect(actualMessage).to.be(expectedMessage);
  });

  bdd.it('Kibana User navigating to Management gets - You do not have permission to manage users', async function () {
    const expectedMessage = 'You do not have permission to manage users.';
    await PageObjects.settings.navigateTo();
    await PageObjects.security.clickElasticsearchUsers();
    const actualMessage = await PageObjects.security.getPermissionDeniedMessage();
    expect(actualMessage).to.be(expectedMessage);
  });

  bdd.it('Kibana User navigating to Management and trying to generate report gets - Reporting Permission Error ', async function () {
    const expectedMessage = 'Reporting: Error 403 Forbidden: Sorry, you don\'t have access to Reporting';
    await PageObjects.common.navigateToApp('visualize');
    const visName1 = 'Connections over time';
    await PageObjects.visualize.openSavedVisualization(visName1);
    await PageObjects.common.sleep(3000);
    PageObjects.common.debug('click Reporting button');
    await PageObjects.header.clickReporting();
    await PageObjects.header.clickPrintablePdf();
    const actualMessage = await PageObjects.header.getToastMessage();
    expect(actualMessage).to.be(expectedMessage);
    await PageObjects.header.clickToastOK();
  });

  bdd.after(async function () {
    await PageObjects.shield.logout();
  });

});
