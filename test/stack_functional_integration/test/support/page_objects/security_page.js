
import { map as mapAsync } from 'bluebird';

import {
  defaultFindTimeout,
} from '../';

import PageObjects from './';

export default class SecurityPage {

  init(remote) {
    this.remote = remote;
  }

  navigateTo() {
    return PageObjects.common.navigateToApp('settings');
  }

  clickElasticsearchUsers() {
    return this.navigateTo()
    .then(() => {
      return this.remote.setFindTimeout(defaultFindTimeout)
      .findDisplayedByLinkText('Users')
      .click();
    });
  }

  clickElasticsearchRoles() {
    return this.navigateTo()
    .then(() => {
      return this.remote.setFindTimeout(defaultFindTimeout)
      .findDisplayedByLinkText('Roles')
      .click();
    });
  }

  // This method is good, but too slow
  // because of 15 second timeout on user.findByCssSelector('[data-test-subj="userRowReserved"]')
  //
  // async getElasticsearchUsers() {
  //   const users = await PageObjects.common.findAllTestSubjects('userRow');
  //   return mapAsync(users, async user => {
  //     const fullnameElement = await user.findByCssSelector('[data-test-subj="userRowFullName"]');
  //     const usernameElement = await user.findByCssSelector('[data-test-subj="userRowUserName"]');
  //     const rolesElement = await user.findByCssSelector('[data-test-subj="userRowRoles"]');
  //     const isReservedElementVisible =
  //       await user.findByCssSelector('[data-test-subj="userRowReserved"]')
  //       .then(() => true)
  //       .catch(() => false);
  //
  //     return {
  //       username: await usernameElement.getVisibleText(),
  //       fullname: await fullnameElement.getVisibleText(),
  //       roles: (await rolesElement.getVisibleText()).split(', '),
  //       reserved: isReservedElementVisible,
  //     };
  //   });
  // }

  async getElasticsearchUsers() {
    const users = await PageObjects.common.findAllTestSubjects('userRow');
    return mapAsync(users, async user => {
      const fullnameElement = await user.findByCssSelector('[data-test-subj="userRowFullName"]');
      const usernameElement = await user.findByCssSelector('[data-test-subj="userRowUserName"]');
      const rolesElement = await user.findByCssSelector('[data-test-subj="userRowRoles"]');
      const isReservedElementVisible = await user.findByCssSelector('td:nth-child(5)');

      return {
        username: await usernameElement.getVisibleText(),
        fullname: await fullnameElement.getVisibleText(),
        roles: (await rolesElement.getVisibleText()).split(', ').map(role => role.trim()),
        reserved: (await isReservedElementVisible.getProperty('innerHTML')).includes('userRowReserved')
      };
    });
  }

  async getElasticsearchRoles() {
    const users = await PageObjects.common.findAllTestSubjects('roleRow');
    return mapAsync(users, async role => {
      const rolenameElement = await role.findByCssSelector('[data-test-subj="roleRowName"]');
      const isReservedElementVisible =  await role.findByCssSelector('td:nth-child(3)');

      return  {
        rolename: await rolenameElement.getVisibleText(),
        reserved: (await isReservedElementVisible.getProperty('innerHTML')).includes('roleRowReserved')
      };
    });
  }

  clickNewUser() {
    return PageObjects.common.findTestSubject('createUserButton').click();
  }

  clickNewRole() {
    return PageObjects.common.findTestSubject('createRoleButton').click();
  }

  addUser(userObj) {
    const self = this;
    return this.clickNewUser()
    .then(function () {
      return PageObjects.common.findTestSubject('userFormUserNameInput').type(userObj.username);
    })
    .then(function () {
      return PageObjects.common.findTestSubject('passwordInput').type(userObj.password);
    })
    .then(function () {
      return PageObjects.common.findTestSubject('passwordConfirmationInput')
        .type(userObj.confirmPassword);
    })
    .then(function () {
      return PageObjects.common.findTestSubject('userFormFullNameInput').type(userObj.fullname);
    })
    .then(function () {
      return PageObjects.common.findTestSubject('userFormEmailInput').type(userObj.email);
    })
    .then(function () {
      function addRoles(role) {
        return role.reduce(function (promise, roleName) {
          return promise
          .then(function () {
            return PageObjects.common.sleep(500);
          })
          .then(function () {
            PageObjects.common.debug('Add role: ' + roleName);
            return self.selectRole(roleName);
          })
          .then(function () {
            return PageObjects.common.sleep(500);
          });

        }, Promise.resolve());
      }
      return addRoles(userObj.roles || []);
    })
    .then(function () {
      if (userObj.save === true) {
        return PageObjects.common.findTestSubject('userFormSaveButton').click();
      } else {
        return PageObjects.common.findTestSubject('userFormCancelButton').click();
      }
    });
  }

  addRole(roleName, userObj) {
    const self = this;
    return this.clickNewRole()
    .then(function () {
      // We have to use non-test-subject selectors because this markup is generated by ui-select.
      PageObjects.common.debug('userObj.indices[0].names = ' + userObj.indices[0].names);
      return PageObjects.common.findTestSubject('roleFormNameInput').type(roleName);
    })
    .then(function () {
      return self.remote.setFindTimeout(defaultFindTimeout)
      // We have to use non-test-subject selectors because this markup is generated by ui-select.
      .findByCssSelector('[data-test-subj="indicesInput0"] .ui-select-search')
      .type(userObj.indices[0].names);
    })
    .then(function () {
      return self.remote.setFindTimeout(defaultFindTimeout)
      // We have to use non-test-subject selectors because this markup is generated by ui-select.
      .findByCssSelector('span.ui-select-choices-row-inner > div[ng-bind-html="indexPattern"]')
      .click();
    })
    .then(function () {
      if (userObj.indices[0].query) {
        return self.remote.setFindTimeout(defaultFindTimeout)
        .findByCssSelector('[data-test-subj="queryInput0"]')
       .type(userObj.indices[0].query);
      }
    })
    .then(function () {

      function addPriv(priv) {

        return priv.reduce(function (promise, privName) {
          // We have to use non-test-subject selectors because this markup is generated by ui-select.
          return promise
          .then(function () {
            return self.remote.setFindTimeout(defaultFindTimeout)
            .findByCssSelector('[data-test-subj="privilegesInput0"] .ui-select-search')
            .click();
          })
          .then(function () {
            console.log('priv item = ' + privName);
            self.remote.setFindTimeout(defaultFindTimeout)
            .findByCssSelector(`[data-test-subj="privilegeOption-${privName}"]`)
            .click();
          })
          .then(function () {
            return PageObjects.common.sleep(500);
          });

        }, Promise.resolve());
      }
      return addPriv(userObj.indices[0].privileges);
    })
    //clicking the Granted fields and removing the asterix
    .then(function () {

      function addGrantedField(field) {
        return field.reduce(function (promise, fieldName) {
          return promise
          .then(function () {
            return self.remote.setFindTimeout(defaultFindTimeout)
            .findByCssSelector('[data-test-subj="fieldInput0"] .ui-select-search')
            .type(fieldName + '\t');
          })
          .then(function () {
            return PageObjects.common.sleep(500);
          });

        }, Promise.resolve());
      }

      if (userObj.indices[0].field_security) {
        // have to remove the '*'
        return self.remote.setFindTimeout(defaultFindTimeout)
        .findByCssSelector('div[data-test-subj="fieldInput0"] > div > span > span > span > span.ui-select-match-close')
        .click()
        .then(function () {
          return addGrantedField(userObj.indices[0].field_security.grant);
        });
      }
    })    //clicking save button
    .then(function () {
      PageObjects.common.debug('click save button');
      PageObjects.common.findTestSubject('roleFormSaveButton').click();
    });
  }

  selectRole(role) {
    // We have to use non-test-subject selectors because this markup is generated by ui-select.
    return this.remote.setFindTimeout(defaultFindTimeout)
    .findByCssSelector('[data-test-subj="userFormRolesDropdown"] div input[aria-label="Select box"]')
    .click()
    .type(role)
    .then(() => {
      return PageObjects.common.sleep(1000);
    })
    .then(() => {
      this.remote.setFindTimeout(defaultFindTimeout)
      .findByCssSelector('div[ng-bind-html="role"]')
      .click();
    })
    .then(() => {
      return PageObjects.common.sleep(1000);
    });
  }
  
  deleteUser(username) {
    let alertText;
    PageObjects.common.debug('Delete user ' + username);
    return this.remote.findDisplayedByLinkText(username).click()
    .then(() => {
      return PageObjects.header.getSpinnerDone();
    })
    .then(() => {
      PageObjects.common.debug('Find delete button and click');
      return PageObjects.common.findTestSubject('userFormDeleteButton').click();
    })
    .then(() => {
      return PageObjects.common.sleep(2000);
    })
    .then (() => {
      return this.remote.setFindTimeout(defaultFindTimeout)
      .findByCssSelector('.kuiModalBodyText').getVisibleText();
    })
    .then ((alert) => {
      alertText = alert;
      PageObjects.common.debug('Delete user alert text = ' + alertText);
      return PageObjects.common.findTestSubject('confirmModalConfirmButton').click();
    })
    .then(() => {
      return alertText;
    });
  }

  getPermissionDeniedMessage() {
    return this.remote.setFindTimeout(defaultFindTimeout)
    .findDisplayedByCssSelector('span.kuiInfoPanelHeader__title')
    .getVisibleText();
  }
}
