/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { faker } from '@faker-js/faker';
import { sample } from 'lodash';

export interface User {
  id: string;
  name: string;
  roles: string[];
}

export const loginCache = new Map();

export function loginUser(user: User) {
  return Boolean(loginCache.set(user.id, user));
}

export function logoutUser(user: User) {
  return Boolean(loginCache.delete(user.id));
}

export function isLoggedIn(user: User) {
  return loginCache.has(user.id);
}

export function createUser(): User {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const userName = faker.internet.userName({ firstName, lastName });
  return {
    id: userName,
    name: `${firstName} ${lastName}`,
    roles: [sample(['admin', 'customer']) as string],
  };
}

export function getLoggedInUser(): User {
  if (loginCache.size > 200) {
    const existingUser = sample(Array.from(loginCache.values()));
    if (existingUser) {
      return existingUser;
    }
  }
  const newUser = createUser();
  loginUser(newUser);
  return newUser;
}
