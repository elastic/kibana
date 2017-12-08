const Joi = require('joi');
const schemas = require('../src/lib/schemas');

describe('projectConfig', () => {
  it('should be valid if upstream is string', () => {
    const { error } = Joi.validate(
      { upstream: 'elastic/kibana' },
      schemas.projectConfig
    );

    expect(error).toBeNull();
  });

  it('should fail if upstream is not a string', () => {
    [true, false, 1337, null, undefined, ''].forEach(value => {
      const { error } = Joi.validate(
        { upstream: value },
        schemas.projectConfig
      );
      expect(error).toEqual(expect.any(Error));
    });
  });

  it('should be valid if branch is object or string', () => {
    const { error } = Joi.validate(
      {
        upstream: 'elastic/kibana',
        branches: ['6.1', { name: '6.x', checked: true }, '5.7']
      },
      schemas.projectConfig
    );
    expect(error).toBeNull();
  });

  it('should support all the keys', () => {
    const { error } = Joi.validate(
      {
        upstream: 'elastic/kibana',
        branches: ['6.1', { name: '6.x', checked: true }, '5.7'],
        own: true,
        multipleCommits: true,
        multipleBranches: true,
        labels: ['test']
      },
      schemas.projectConfig
    );
    expect(error).toBeNull();
  });
});

describe('globalConfig', () => {
  it('should be valid if it contains username and accessToken', () => {
    const { error } = Joi.validate(
      { username: 'sqren', accessToken: 'myAccessToken' },
      schemas.globalConfig
    );

    expect(error).toBeNull();
  });

  it('should be invalid if it does not contains username or accessToken', () => {
    const { error } = Joi.validate(
      { accessToken: 'myAccessToken' },
      schemas.globalConfig
    );

    expect(error).toEqual(expect.any(Error));
  });

  it('should be valid if it contains projectConfig in project key', () => {
    const { error } = Joi.validate(
      {
        username: 'sqren',
        accessToken: 'myAccessToken',
        projects: [
          {
            upstream: 'elastic/kibana',
            branches: ['6.1', { name: '6.x', checked: true }, '5.7']
          }
        ]
      },
      schemas.globalConfig
    );

    expect(error).toEqual(null);
  });
});
