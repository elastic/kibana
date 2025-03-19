/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  validateCommonConfig,
  validateCommonSecrets,
  validateCommonConnector,
  validateOtherFieldsKeys,
} from './validators';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';

const configurationUtilities = actionsConfigMock.create();

describe('validateCommonConfig', () => {
  test('config validation fails when apiUrl is not allowed', () => {
    expect(() =>
      validateCommonConfig(
        {
          apiUrl: 'example.com/do-something',
          usesTableApi: true,
          isOAuth: false,
          userIdentifierValue: null,
          clientId: null,
          jwtKeyId: null,
        },
        {
          configurationUtilities: {
            ...configurationUtilities,
            ensureUriAllowed: (_) => {
              throw new Error(`target url is not present in allowedHosts`);
            },
          },
        }
      )
    ).toThrowErrorMatchingInlineSnapshot(
      `"error configuring connector action: target url is not present in allowedHosts"`
    );
  });
  describe('when isOAuth = true', () => {
    test('config validation fails when userIdentifierValue is null', () => {
      expect(() =>
        validateCommonConfig(
          {
            apiUrl: 'https://url',
            usesTableApi: true,
            isOAuth: true,
            userIdentifierValue: null,
            clientId: 'clientId',
            jwtKeyId: 'jwtKeyId',
          },
          { configurationUtilities }
        )
      ).toThrowErrorMatchingInlineSnapshot(
        `"userIdentifierValue must be provided when isOAuth = true"`
      );
    });
    test('config validation fails when clientId is null', () => {
      expect(() =>
        validateCommonConfig(
          {
            apiUrl: 'https://url',
            usesTableApi: true,
            isOAuth: true,
            userIdentifierValue: 'userIdentifierValue',
            clientId: null,
            jwtKeyId: 'jwtKeyId',
          },
          { configurationUtilities }
        )
      ).toThrowErrorMatchingInlineSnapshot(`"clientId must be provided when isOAuth = true"`);
    });
    test('config validation fails when jwtKeyId is null', () => {
      expect(() =>
        validateCommonConfig(
          {
            apiUrl: 'https://url',
            usesTableApi: true,
            isOAuth: true,
            userIdentifierValue: 'userIdentifierValue',
            clientId: 'clientId',
            jwtKeyId: null,
          },
          { configurationUtilities }
        )
      ).toThrowErrorMatchingInlineSnapshot(`"jwtKeyId must be provided when isOAuth = true"`);
    });
  });

  describe('when isOAuth = false', () => {
    test('connector validation fails when username is null', () => {
      expect(
        validateCommonConnector(
          {
            apiUrl: 'https://url',
            usesTableApi: true,
            isOAuth: false,
            userIdentifierValue: null,
            clientId: null,
            jwtKeyId: null,
          },
          {
            password: 'password',
            username: null,
            clientSecret: null,
            privateKey: null,
            privateKeyPassword: null,
          }
        )
      ).toEqual(`username must be provided when isOAuth = false`);
    });
    test('connector validation fails when password is null', () => {
      expect(
        validateCommonConnector(
          {
            apiUrl: 'https://url',
            usesTableApi: true,
            isOAuth: false,
            userIdentifierValue: null,
            clientId: null,
            jwtKeyId: null,
          },
          {
            password: null,
            username: 'username',
            clientSecret: null,
            privateKey: null,
            privateKeyPassword: null,
          }
        )
      ).toEqual(`password must be provided when isOAuth = false`);
    });
    test('connector validation fails when any oauth related field is defined', () => {
      expect(
        validateCommonConnector(
          {
            apiUrl: 'https://url',
            usesTableApi: true,
            isOAuth: false,
            userIdentifierValue: null,
            clientId: null,
            jwtKeyId: null,
          },
          {
            password: 'password',
            username: 'username',
            clientSecret: 'clientSecret',
            privateKey: null,
            privateKeyPassword: null,
          }
        )
      ).toEqual(
        `clientId, clientSecret, userIdentifierValue, jwtKeyId and privateKey should not be provided with isOAuth = false`
      );
    });
  });
});

describe('validateCommonSecrets', () => {
  test('secrets validation fails when no credentials are defined', () => {
    expect(() =>
      validateCommonSecrets(
        {
          password: null,
          username: null,
          clientSecret: null,
          privateKey: null,
          privateKeyPassword: null,
        },
        { configurationUtilities }
      )
    ).toThrowErrorMatchingInlineSnapshot(
      `"Either basic auth or OAuth credentials must be specified"`
    );
  });

  test('secrets validation fails when username is defined and password is not', () => {
    expect(() =>
      validateCommonSecrets(
        {
          password: null,
          username: 'admin',
          clientSecret: null,
          privateKey: null,
          privateKeyPassword: null,
        },
        { configurationUtilities }
      )
    ).toThrowErrorMatchingInlineSnapshot(`"username and password must both be specified"`);
  });

  test('secrets validation fails when password is defined and username is not', () => {
    expect(() =>
      validateCommonSecrets(
        {
          password: 'password',
          username: null,
          clientSecret: null,
          privateKey: null,
          privateKeyPassword: null,
        },
        { configurationUtilities }
      )
    ).toThrowErrorMatchingInlineSnapshot(`"username and password must both be specified"`);
  });

  test('secrets validation fails when clientSecret is defined and privateKey is not', () => {
    expect(() =>
      validateCommonSecrets(
        {
          password: null,
          username: null,
          clientSecret: 'secret',
          privateKey: null,
          privateKeyPassword: null,
        },
        { configurationUtilities }
      )
    ).toThrowErrorMatchingInlineSnapshot(`"clientSecret and privateKey must both be specified"`);
  });

  test('secrets validation fails when privateKey is defined and clientSecret is not', () => {
    expect(() =>
      validateCommonSecrets(
        {
          password: null,
          username: null,
          clientSecret: null,
          privateKey: 'private',
          privateKeyPassword: null,
        },
        { configurationUtilities }
      )
    ).toThrowErrorMatchingInlineSnapshot(`"clientSecret and privateKey must both be specified"`);
  });
});

describe('validateCommonConnector', () => {
  describe('when isOAuth = true', () => {
    test('connector validation fails when userIdentifierValue is null', () => {
      expect(
        validateCommonConnector(
          {
            apiUrl: 'https://url',
            usesTableApi: true,
            isOAuth: true,
            userIdentifierValue: null,
            clientId: 'clientId',
            jwtKeyId: 'jwtKeyId',
          },
          {
            password: null,
            username: null,
            clientSecret: 'clientSecret',
            privateKey: 'privateKey',
            privateKeyPassword: null,
          }
        )
      ).toEqual(`userIdentifierValue must be provided when isOAuth = true`);
    });
    test('connector validation fails when clientId is null', () => {
      expect(
        validateCommonConnector(
          {
            apiUrl: 'https://url',
            usesTableApi: true,
            isOAuth: true,
            userIdentifierValue: 'userIdentifierValue',
            clientId: null,
            jwtKeyId: 'jwtKeyId',
          },
          {
            password: null,
            username: null,
            clientSecret: 'clientSecret',
            privateKey: 'privateKey',
            privateKeyPassword: null,
          }
        )
      ).toEqual(`clientId must be provided when isOAuth = true`);
    });
    test('connector validation fails when jwtKeyId is null', () => {
      expect(
        validateCommonConnector(
          {
            apiUrl: 'https://url',
            usesTableApi: true,
            isOAuth: true,
            userIdentifierValue: 'userIdentifierValue',
            clientId: 'clientId',
            jwtKeyId: null,
          },
          {
            password: null,
            username: null,
            clientSecret: 'clientSecret',
            privateKey: 'privateKey',
            privateKeyPassword: null,
          }
        )
      ).toEqual(`jwtKeyId must be provided when isOAuth = true`);
    });
    test('connector validation fails when clientSecret is null', () => {
      expect(
        validateCommonConnector(
          {
            apiUrl: 'https://url',
            usesTableApi: true,
            isOAuth: true,
            userIdentifierValue: 'userIdentifierValue',
            clientId: 'clientId',
            jwtKeyId: 'jwtKeyId',
          },
          {
            password: null,
            username: null,
            clientSecret: null,
            privateKey: 'privateKey',
            privateKeyPassword: null,
          }
        )
      ).toEqual(`clientSecret must be provided when isOAuth = true`);
    });
    test('connector validation fails when privateKey is null', () => {
      expect(
        validateCommonConnector(
          {
            apiUrl: 'https://url',
            usesTableApi: true,
            isOAuth: true,
            userIdentifierValue: 'userIdentifierValue',
            clientId: 'clientId',
            jwtKeyId: 'jwtKeyId',
          },
          {
            password: null,
            username: null,
            clientSecret: 'clientSecret',
            privateKey: null,
            privateKeyPassword: null,
          }
        )
      ).toEqual(`privateKey must be provided when isOAuth = true`);
    });
    test('connector validation fails when username and password are not null', () => {
      expect(
        validateCommonConnector(
          {
            apiUrl: 'https://url',
            usesTableApi: true,
            isOAuth: true,
            userIdentifierValue: 'userIdentifierValue',
            clientId: 'clientId',
            jwtKeyId: 'jwtKeyId',
          },
          {
            password: 'password',
            username: 'username',
            clientSecret: 'clientSecret',
            privateKey: 'privateKey',
            privateKeyPassword: null,
          }
        )
      ).toEqual(`Username and password should not be provided with isOAuth = true`);
    });
  });

  describe('when isOAuth = false', () => {
    test('connector validation fails when username is null', () => {
      expect(
        validateCommonConnector(
          {
            apiUrl: 'https://url',
            usesTableApi: true,
            isOAuth: false,
            userIdentifierValue: null,
            clientId: null,
            jwtKeyId: null,
          },
          {
            password: 'password',
            username: null,
            clientSecret: null,
            privateKey: null,
            privateKeyPassword: null,
          }
        )
      ).toEqual(`username must be provided when isOAuth = false`);
    });
    test('connector validation fails when password is null', () => {
      expect(
        validateCommonConnector(
          {
            apiUrl: 'https://url',
            usesTableApi: true,
            isOAuth: false,
            userIdentifierValue: null,
            clientId: null,
            jwtKeyId: null,
          },
          {
            password: null,
            username: 'username',
            clientSecret: null,
            privateKey: null,
            privateKeyPassword: null,
          }
        )
      ).toEqual(`password must be provided when isOAuth = false`);
    });
    test('connector validation fails when any oauth related field is defined', () => {
      expect(
        validateCommonConnector(
          {
            apiUrl: 'https://url',
            usesTableApi: true,
            isOAuth: false,
            userIdentifierValue: null,
            clientId: null,
            jwtKeyId: null,
          },
          {
            password: 'password',
            username: 'username',
            clientSecret: 'clientSecret',
            privateKey: null,
            privateKeyPassword: null,
          }
        )
      ).toEqual(
        `clientId, clientSecret, userIdentifierValue, jwtKeyId and privateKey should not be provided with isOAuth = false`
      );
    });
  });

  describe('validateOtherFieldsKeys', () => {
    it('returns an error if the keys are not allowed', () => {
      expect(validateOtherFieldsKeys('short_description')).toEqual(
        'The following properties cannot be defined inside additional_fields: short_description.'
      );
    });
  });
});
