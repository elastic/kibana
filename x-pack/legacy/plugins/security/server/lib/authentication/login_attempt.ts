/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Represents login credentials.
 */
interface LoginCredentials {
  username: string;
  password: string;
}

/**
 * A LoginAttempt represents a single attempt to provide login credentials.
 * Once credentials are set, they cannot be changed.
 */
export class LoginAttempt {
  /**
   * Username and password for login.
   */
  private credentials: LoginCredentials | null = null;

  /**
   * Gets the username and password for this login.
   */
  public getCredentials() {
    return this.credentials;
  }

  /**
   * Sets the username and password for this login.
   */
  public setCredentials(username: string, password: string) {
    if (this.credentials) {
      throw new Error('Credentials for login attempt have already been set');
    }

    this.credentials = Object.freeze({ username, password });
  }
}
