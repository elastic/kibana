
import expect from 'expect.js';
import { indexBy } from 'lodash';

import {
  bdd,
  esClient
} from '../../../support';

import PageObjects from '../../../support/page_objects';

bdd.describe('field level security', function describeIndexTests() {

  bdd.before(async function () {

    let response = await esClient.index('flstest', 'customer_type', '1', {
      "customer_name"  : "ABC Company",
      "customer_region": "EAST",
      "customer_ssn"   : "111.222.3333"

    });
    PageObjects.common.debug(response);
    expect(response._shards.successful).to.eql(1);

    response = await esClient.index('flstest', 'customer_type', '2',{
      "customer_name"  : "ABC Company",
      "customer_region": "WEST",
      "customer_ssn"   : "444.555.6666"

    });
    PageObjects.common.debug(response);
    expect(response._shards.successful).to.eql(1);

    await PageObjects.common.sleep(3000);
    await PageObjects.settings.navigateTo();
    await PageObjects.settings.clickKibanaIndicies();
    await PageObjects.settings.clickOptionalAddNewButton();
    await PageObjects.settings.setIndexPatternField('flstest');
    await PageObjects.common.sleep(2000);
    await PageObjects.common.try(async () => {
      await PageObjects.settings.getCreateButton().click();
      await PageObjects.settings.clickDefaultIndexButton();
    });
  });


  bdd.it('should add new role viewssnrole', async function () {
    await PageObjects.settings.navigateTo();
    await PageObjects.security.clickElasticsearchRoles();
    await PageObjects.security.addRole('viewssnrole', {
      "indices": [{
        "names": [ "flstest" ],
        "privileges": [ "read", "view_index_metadata" ],
        "field_security": { "grant": ["customer_ssn", "customer_name", "customer_region", "customer_type"] }
      }]
    });
    await PageObjects.common.sleep(1000);
    const roles = indexBy(await PageObjects.security.getElasticsearchRoles(), 'rolename');
    PageObjects.common.debug('actualRoles = %j', roles);
    expect(roles).to.have.key('viewssnrole');
    expect(roles.viewssnrole.reserved).to.be(false);
    PageObjects.common.saveScreenshot('Security_Roles');
  });

  //Add viewnossnrole
  bdd.it('should add new role view_no_ssn_role', async function () {
    await PageObjects.security.addRole('view_no_ssn_role', {
      "indices": [{
        "names": [ "flstest" ],
        "privileges": [ "read", "view_index_metadata" ],
        "field_security": { "grant": ["customer_name", "customer_region", "customer_type"] }
      }]
    });
    await PageObjects.common.sleep(1000);
    const roles = indexBy(await PageObjects.security.getElasticsearchRoles(), 'rolename');
    PageObjects.common.debug('actualRoles = %j', roles);
    expect(roles).to.have.key('view_no_ssn_role');
    expect(roles.view_no_ssn_role.reserved).to.be(false);
    PageObjects.common.saveScreenshot('Security_Roles');
  });


  bdd.it('should add new user customer1 ', async function () {
    // await PageObjects.settings.navigateTo();
    await PageObjects.security.clickElasticsearchUsers();
    await PageObjects.security.addUser({ username: 'customer1', password: 'changeme',
      confirmPassword: 'changeme', fullname: 'customer one', email: 'flstest@elastic.com', save: true,
      roles: ['kibana_user', 'viewssnrole'] });
    const users = indexBy(await PageObjects.security.getElasticsearchUsers(), 'username');
    PageObjects.common.debug('actualUsers = %j', users);
    expect(users.customer1.roles).to.eql(['kibana_user', 'viewssnrole']);
  });

  //Add customer2 who has view_no_ssn_role
  bdd.it('should add new user customer2 ', async function () {
    // await PageObjects.settings.navigateTo();
    // await PageObjects.security.clickElasticsearchUsers();
    await PageObjects.security.addUser({ username: 'customer2', password: 'changeme',
      confirmPassword: 'changeme', fullname: 'customer two', email: 'flstest@elastic.com', save: true,
      roles: ['kibana_user', 'view_no_ssn_role'] });
    const users = indexBy(await PageObjects.security.getElasticsearchUsers(), 'username');
    PageObjects.common.debug('actualUsers = %j', users);
    expect(users.customer2.roles).to.eql(['kibana_user', 'view_no_ssn_role']);
  });


//login as customer1
  bdd.it('user customer1 should see ssn', async function () {
    await PageObjects.shield.logoutLogin('customer1', 'changeme');
    await PageObjects.common.navigateToApp('discover');
    await PageObjects.discover.selectIndexPattern('flstest');
    await PageObjects.common.tryForTime(10000, async () => {
      const hitCount = await PageObjects.discover.getHitCount();
      expect(hitCount).to.be('2');
    });
    const rowData = await PageObjects.discover.getDocTableIndex(1);
    expect(rowData).to
    .be('customer_ssn:444.555.6666 customer_name:ABC Company customer_region:WEST _id:2 _type:customer_type _index:flstest _score:1');
  });

//login as customer2 and he should see no ssn field
  bdd.it('user customer2 should not see ssn', async function () {
    await PageObjects.shield.logoutLogin('customer2', 'changeme');
    await PageObjects.common.navigateToApp('discover');
    await PageObjects.discover.selectIndexPattern('flstest');
    await PageObjects.common.tryForTime(10000, async () => {
      const hitCount = await PageObjects.discover.getHitCount();
      expect(hitCount).to.be('2');
    });
    const rowData = await PageObjects.discover.getDocTableIndex(1);
    expect(rowData).to.be('customer_name:ABC Company customer_region:WEST _id:2 _type:customer_type _index:flstest _score:1');
  });

  // this user can't search on anything in the _all field even if the value
  // is in a field they have access to
  bdd.it('user customer2 can search without the field name', async function () {
    await PageObjects.discover.query('east');
    await PageObjects.common.tryForTime(10000, async () => {
      const hitCount = await PageObjects.discover.getHitCount();
      expect(hitCount).to.be('1');

    });
  });

  bdd.it('user customer2 cannot search on customer_ssn field', async function () {
    await PageObjects.discover.query('customer_ssn:444.555.6666');
    await PageObjects.common.tryForTime(10000, async () => {
      const hitCount = await PageObjects.discover.hasNoResults();
      expect(hitCount).to.be(true);
    });
  });

  bdd.it('user customer2 cannot search on ssn', async function () {
    await PageObjects.discover.query('444.555.6666');
    await PageObjects.common.tryForTime(10000, async () => {
      const hitCount = await PageObjects.discover.hasNoResults();
      expect(hitCount).to.be(true);
    });
  });

  bdd.it('user customer2 can search on customer_region east', async function () {
    await PageObjects.discover.query('customer_region:east');
    await PageObjects.common.tryForTime(10000, async () => {
      const hitCount = await PageObjects.discover.getHitCount();
      expect(hitCount).to.be('1');
    });
  });


  bdd.after(async function () {
    await PageObjects.shield.logout();
  });

});
