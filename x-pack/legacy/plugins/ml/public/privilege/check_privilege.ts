/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

// @ts-ignore
import { hasLicenseExpired } from '../license/check_license';

import { Privileges, getDefaultPrivileges } from '../../common/types/privileges';
import { getPrivileges, getManageMlPrivileges } from './get_privileges';
import { ACCESS_DENIED_PATH } from '../management/management_urls';

let privileges: Privileges = getDefaultPrivileges();
// manage_ml requires all monitor and admin cluster privileges: https://github.com/elastic/elasticsearch/blob/664a29c8905d8ce9ba8c18aa1ed5c5de93a0eabc/x-pack/plugin/core/src/main/java/org/elasticsearch/xpack/core/security/authz/privilege/ClusterPrivilege.java#L53
export function canGetManagementMlJobs(kbnUrl: any) {
  return new Promise((resolve, reject) => {
    getManageMlPrivileges().then(
      ({ capabilities, isPlatinumOrTrialLicense, mlFeatureEnabledInSpace }) => {
        privileges = capabilities;
        // Loop through all privilages to ensure they are all set to true.
        const isManageML = Object.values(privileges).every(p => p === true);

        if (isManageML === true && isPlatinumOrTrialLicense === true) {
          return resolve({ mlFeatureEnabledInSpace });
        } else {
          kbnUrl.redirect(ACCESS_DENIED_PATH);
          return reject();
        }
      }
    );
  });
}

export function checkGetJobsPrivilege(kbnUrl: any): Promise<Privileges> {
  return new Promise((resolve, reject) => {
    getPrivileges().then(({ capabilities, isPlatinumOrTrialLicense }) => {
      privileges = capabilities;
      // the minimum privilege for using ML with a platinum or trial license is being able to get the transforms list.
      // all other functionality is controlled by the return privileges object.
      // if the license is basic (isPlatinumOrTrialLicense === false) then do not redirect,
      // allow the promise to resolve as the separate license check will redirect then user to
      // a basic feature
      if (privileges.canGetJobs || isPlatinumOrTrialLicense === false) {
        return resolve(privileges);
      } else {
        kbnUrl.redirect('/access-denied');
        return reject();
      }
    });
  });
}

export function checkCreateJobsPrivilege(kbnUrl: any): Promise<Privileges> {
  return new Promise((resolve, reject) => {
    getPrivileges().then(({ capabilities, isPlatinumOrTrialLicense }) => {
      privileges = capabilities;
      // if the license is basic (isPlatinumOrTrialLicense === false) then do not redirect,
      // allow the promise to resolve as the separate license check will redirect then user to
      // a basic feature
      if (privileges.canCreateJob || isPlatinumOrTrialLicense === false) {
        return resolve(privileges);
      } else {
        // if the user has no permission to create a job,
        // redirect them back to the Transforms Management page
        kbnUrl.redirect('/jobs');
        return reject();
      }
    });
  });
}

export function checkFindFileStructurePrivilege(kbnUrl: any): Promise<Privileges> {
  return new Promise((resolve, reject) => {
    getPrivileges().then(({ capabilities }) => {
      privileges = capabilities;
      // the minimum privilege for using ML with a basic license is being able to use the datavisualizer.
      // all other functionality is controlled by the return privileges object
      if (privileges.canFindFileStructure) {
        return resolve(privileges);
      } else {
        kbnUrl.redirect('/access-denied');
        return reject();
      }
    });
  });
}

export function checkGetDataFrameTransformsPrivilege(kbnUrl: any): Promise<Privileges> {
  return new Promise((resolve, reject) => {
    getPrivileges().then(({ capabilities }) => {
      privileges = capabilities;
      // the minimum privilege for using ML with a basic license is being able to use the data frames.
      // all other functionality is controlled by the return privileges object
      if (privileges.canGetDataFrame) {
        return resolve(privileges);
      } else {
        kbnUrl.redirect('/data_frames/access-denied');
        return reject();
      }
    });
  });
}

export function checkCreateDataFrameTransformPrivilege(kbnUrl: any): Promise<Privileges> {
  return new Promise((resolve, reject) => {
    getPrivileges().then(({ capabilities }) => {
      privileges = capabilities;
      if (
        privileges.canCreateDataFrame &&
        privileges.canPreviewDataFrame &&
        privileges.canStartStopDataFrame
      ) {
        return resolve(privileges);
      } else {
        // if the user has no permission to create a data frame transform,
        // redirect them back to the Data Frame Transforms Management page
        kbnUrl.redirect('/data_frames');
        return reject();
      }
    });
  });
}

// check the privilege type and the license to see whether a user has permission to access a feature.
// takes the name of the privilege variable as specified in get_privileges.js
export function checkPermission(privilegeType: keyof Privileges) {
  const licenseHasExpired = hasLicenseExpired();
  return privileges[privilegeType] === true && licenseHasExpired !== true;
}

// create the text for the button's tooltips if the user's license has
// expired or if they don't have the privilege to press that button
export function createPermissionFailureMessage(privilegeType: keyof Privileges) {
  let message = '';
  const licenseHasExpired = hasLicenseExpired();
  if (licenseHasExpired) {
    message = i18n.translate('xpack.ml.privilege.licenseHasExpiredTooltip', {
      defaultMessage: 'Your license has expired.',
    });
  } else if (privilegeType === 'canCreateJob') {
    message = i18n.translate('xpack.ml.privilege.noPermission.createMLJobsTooltip', {
      defaultMessage: 'You do not have permission to create Machine Learning jobs.',
    });
  } else if (privilegeType === 'canStartStopDatafeed') {
    message = i18n.translate('xpack.ml.privilege.noPermission.startOrStopDatafeedsTooltip', {
      defaultMessage: 'You do not have permission to start or stop datafeeds.',
    });
  } else if (privilegeType === 'canUpdateJob') {
    message = i18n.translate('xpack.ml.privilege.noPermission.editJobsTooltip', {
      defaultMessage: 'You do not have permission to edit jobs.',
    });
  } else if (privilegeType === 'canDeleteJob') {
    message = i18n.translate('xpack.ml.privilege.noPermission.deleteJobsTooltip', {
      defaultMessage: 'You do not have permission to delete jobs.',
    });
  } else if (privilegeType === 'canCreateCalendar') {
    message = i18n.translate('xpack.ml.privilege.noPermission.createCalendarsTooltip', {
      defaultMessage: 'You do not have permission to create calendars.',
    });
  } else if (privilegeType === 'canDeleteCalendar') {
    message = i18n.translate('xpack.ml.privilege.noPermission.deleteCalendarsTooltip', {
      defaultMessage: 'You do not have permission to delete calendars.',
    });
  } else if (privilegeType === 'canForecastJob') {
    message = i18n.translate('xpack.ml.privilege.noPermission.runForecastsTooltip', {
      defaultMessage: 'You do not have permission to run forecasts.',
    });
  } else if (privilegeType === 'canCreateDataFrame') {
    message = i18n.translate('xpack.ml.privilege.noPermission.createDataFrameTransformTooltip', {
      defaultMessage: 'You do not have permission to create data frame transforms.',
    });
  } else if (privilegeType === 'canStartStopDataFrame') {
    message = i18n.translate(
      'xpack.ml.privilege.noPermission.startOrStopDataFrameTransformTooltip',
      {
        defaultMessage: 'You do not have permission to start or stop data frame transforms.',
      }
    );
  } else if (privilegeType === 'canDeleteDataFrame') {
    message = i18n.translate('xpack.ml.privilege.noPermission.deleteDataFrameTransformTooltip', {
      defaultMessage: 'You do not have permission to delete data frame transforms.',
    });
  }
  return i18n.translate('xpack.ml.privilege.pleaseContactAdministratorTooltip', {
    defaultMessage: '{message} Please contact your administrator.',
    values: {
      message,
    },
  });
}
