import Joi from 'joi';
import { projectConfig, globalConfig } from '../src/lib/schemas';

describe('projectConfig', () => {
  it('should not be valid', () => {
    [
      { upstream: 'elastic/kibana' },
      { upstream: true },
      { upstream: false },
      { upstream: 1337 }
    ].forEach(config => {
      const { error } = Joi.validate(config, projectConfig);
      expect(error).toEqual(expect.any(Error));
    });
  });

  it('should be valid', () => {
    [
      {
        upstream: 'elastic/kibana',
        branches: ['6.1', { name: '6.x', checked: true }, '5.7']
      },
      {
        upstream: 'elastic/kibana',
        branches: ['6.1', { name: '6.x', checked: true }, '5.7'],
        all: false,
        multipleCommits: true,
        multipleBranches: true,
        labels: ['test']
      }
    ].forEach(config => {
      const { error } = Joi.validate(config, projectConfig);
      expect(error).toBeNull();
    });
  });
});

describe('globalConfig', () => {
  it('should be valid if it contains username and accessToken', () => {
    const { error } = Joi.validate(
      { username: 'sqren', accessToken: 'myAccessToken' },
      globalConfig
    );

    expect(error).toBeNull();
  });

  it('should be invalid if it does not contains username or accessToken', () => {
    const { error } = Joi.validate(
      { accessToken: 'myAccessToken' },
      globalConfig
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
      globalConfig
    );

    expect(error).toEqual(null);
  });
});
