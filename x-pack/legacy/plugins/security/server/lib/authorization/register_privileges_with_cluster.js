/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { difference, isEmpty, isEqual } from 'lodash';
import { getClient } from '../../../../../server/lib/get_client_shield';
import { serializePrivileges } from './privileges_serializer';

export async function registerPrivilegesWithCluster(server) {
  const { application, privileges } = server.plugins.security.authorization;

  const arePrivilegesEqual = (existingPrivileges, expectedPrivileges) => {
    // when comparing privileges, the order of the actions doesn't matter, lodash's isEqual
    // doesn't know how to compare Sets
    return isEqual(existingPrivileges, expectedPrivileges, (value, other, key) => {
      if (key === 'actions' && Array.isArray(value) && Array.isArray(other)) {
        // Array.sort() is in-place, and we don't want to be modifying the actual order
        // of the arrays permanently, and there's potential they're frozen, so we're copying
        // before comparing.
        return isEqual([...value].sort(), [...other].sort());
      }
    });
  };

  const getPrivilegesToDelete = (existingPrivileges, expectedPrivileges) => {
    if (isEmpty(existingPrivileges)) {
      return [];
    }

    return difference(
      Object.keys(existingPrivileges[application]),
      Object.keys(expectedPrivileges[application])
    );
  };

  const expectedPrivileges = serializePrivileges(application, privileges.get());

  server.log(
    ['security', 'debug'],
    `Registering Kibana Privileges with Elasticsearch for ${application}`
  );

  const callCluster = getClient(server).callWithInternalUser;

  try {
    // we only want to post the privileges when they're going to change as Elasticsearch has
    // to clear the role cache to get these changes reflected in the _has_privileges API
    const existingPrivileges = await callCluster(`shield.getPrivilege`, { privilege: application });
    if (arePrivilegesEqual(existingPrivileges, expectedPrivileges)) {
      server.log(
        ['security', 'debug'],
        `Kibana Privileges already registered with Elasticearch for ${application}`
      );
      return;
    }

    const privilegesToDelete = getPrivilegesToDelete(existingPrivileges, expectedPrivileges);
    for (const privilegeToDelete of privilegesToDelete) {
      server.log(
        ['security', 'debug'],
        `Deleting Kibana Privilege ${privilegeToDelete} from Elasticearch for ${application}`
      );
      try {
        await callCluster('shield.deletePrivilege', {
          application,
          privilege: privilegeToDelete,
        });
      } catch (err) {
        server.log(['security', 'error'], `Error deleting Kibana Privilege ${privilegeToDelete}`);
        throw err;
      }
    }

    await callCluster('shield.postPrivileges', {
      body: expectedPrivileges,
    });
    server.log(
      ['security', 'debug'],
      `Updated Kibana Privileges with Elasticearch for ${application}`
    );
  } catch (err) {
    server.log(
      ['security', 'error'],
      `Error registering Kibana Privileges with Elasticsearch for ${application}: ${err.message}`
    );
    throw err;
  }
}
