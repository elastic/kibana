
import expect from 'expect.js';
import {indexBy} from 'lodash';

import {
  bdd
} from '../../../support';

import PageObjects from '../../../support/page_objects';

bdd.describe('users app', function describeIndexTests() {
  const kbnInternVars = global.__kibana__intern__;
  const config = kbnInternVars.intern.config;


  bdd.before(function () {
    PageObjects.common.debug('users');
    this.remote.setWindowSize(1400,800);
    return PageObjects.settings.navigateTo()
    .then(() => {
      return PageObjects.security.clickElasticsearchUsers();
    });
  });


  bdd.describe('users', function () {

    bdd.it('should show the default elastic and kibana users', async function () {
      const users = indexBy(await PageObjects.security.getElasticsearchUsers(), 'username');
      PageObjects.common.debug('actualUsers = %j', users);
      if (config.servers.elasticsearch.hostname === 'localhost') {
        expect(users.elastic.roles).to.eql(['superuser']);
        expect(users.elastic.reserved).to.be(true);
        expect(users.kibana.roles).to.eql(['kibana_system']);
        expect(users.kibana.reserved).to.be(true);
      } else {
        expect(users.anonymous.roles).to.eql(['anonymous']);
        expect(users.anonymous.reserved).to.be(true);
      }
      PageObjects.common.saveScreenshot('Security_Users');
    });

    // bdd.it('should show disabled checkboxes for default elastic and kibana users', function () {
    // });

    // "cancel" type button went away, but coming back on another PR
    // bdd.it('should cancel adding new user', async function () {
    //   await PageObjects.security.addUser({username: 'Lee', password: 'LeePwd',
    //     confirmPassword: 'LeePwd', fullname: 'LeeFirst LeeLast', email: 'lee@myEmail.com', save: false});
    //   const users = indexBy(await PageObjects.security.getElasticsearchUsers(), 'username');
    //   PageObjects.common.debug('actualUsers = %j', users);
    //   expect(users.Lee).to.throw(Error);
    // });

    bdd.it('should add new user', async function () {
      await PageObjects.security.addUser({username: 'Lee', password: 'LeePwd',
        confirmPassword: 'LeePwd', fullname: 'LeeFirst LeeLast', email: 'lee@myEmail.com', save: true, roles: ['kibana_user']});
      const users = indexBy(await PageObjects.security.getElasticsearchUsers(), 'username');
      PageObjects.common.debug('actualUsers = %j', users);
      expect(users.Lee.roles).to.eql(['kibana_user']);
      expect(users.Lee.fullname).to.eql('LeeFirst LeeLast');
      expect(users.Lee.reserved).to.be(false);
    });

    bdd.it('should delete user', async function () {
      const alertMsg = await PageObjects.security.deleteUser('Lee');
      PageObjects.common.debug('alertMsg = %s', alertMsg);
      const users = indexBy(await PageObjects.security.getElasticsearchUsers(), 'username');
      PageObjects.common.debug('actualUsers = %j', users);
      expect(users).to.not.have.key('Lee');
    });

    bdd.it('should show the default roles', async function () {
      await PageObjects.security.clickElasticsearchRoles();
      const roles = indexBy(await PageObjects.security.getElasticsearchRoles(), 'rolename');
      PageObjects.common.debug('actualRoles = %j', roles);
      expect(roles.ingest_admin.reserved).to.be(true);
      expect(roles.kibana_user.reserved).to.be(true);
      expect(roles.monitoring_user.reserved).to.be(true);
      expect(roles.remote_monitoring_agent.reserved).to.be(true);
      expect(roles.reporting_user.reserved).to.be(true);
      expect(roles.logstash_system.reserved).to.be(true);
      expect(roles.superuser.reserved).to.be(true);
      expect(roles.kibana_system.reserved).to.be(true);
      expect(roles.transport_client.reserved).to.be(true);
      PageObjects.common.saveScreenshot('Security_Roles');
    });


  });
});
