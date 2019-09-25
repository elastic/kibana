/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useContext } from 'react';

import { AuthorizationContext } from './authorization_provider';
import { hasPrivilegeFactory, toArray, MissingPrivileges, Privilege } from './common';

interface Props {
  /**
   * Each required privilege must have the format "section.privilege".
   * To indicate that *all* privileges from a section are required, we can use the asterix
   * e.g. "index.*"
   */
  privileges: string | string[];
  children: (childrenProps: {
    isLoading: boolean;
    hasPrivileges: boolean;
    privilegesMissing: MissingPrivileges;
  }) => JSX.Element;
}

export const WithPrivileges = ({ privileges: requiredPrivileges, children }: Props) => {
  const { isLoading, privileges } = useContext(AuthorizationContext);

  const privilegesToArray: Privilege[] = toArray(requiredPrivileges).map(p => {
    const [section, privilege] = p.split('.');
    if (!privilege) {
      // Oh! we forgot to use the dot "." notation.
      throw new Error('Required privilege must have the format "section.privilege"');
    }
    return [section, privilege];
  });

  const hasPrivilege = hasPrivilegeFactory(privileges);
  const hasPrivileges = isLoading ? false : privilegesToArray.every(hasPrivilege);

  const privilegesMissing = privilegesToArray.reduce(
    (acc, [section, privilege]) => {
      if (privilege === '*') {
        acc[section] = privileges.missingPrivileges[section] || [];
      } else if (
        privileges.missingPrivileges[section] &&
        privileges.missingPrivileges[section]!.includes(privilege)
      ) {
        const missing: string[] = acc[section] || [];
        acc[section] = [...missing, privilege];
      }

      return acc;
    },
    {} as MissingPrivileges
  );

  return children({ isLoading, hasPrivileges, privilegesMissing });
};
