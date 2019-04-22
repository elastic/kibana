import { validateOptions } from '../../src/options/options';

const validOptions = {
  accessToken: 'myAccessToken',
  all: false,
  branchChoices: [],
  branches: ['branchA'],
  labels: [],
  multiple: false,
  multipleBranches: true,
  multipleCommits: false,
  sha: undefined,
  upstream: 'elastic/kibana',
  username: 'sqren'
};

describe('validateOptions', () => {
  describe('should not throw', () => {
    it('when all options are valid and `branches` is given', () => {
      expect(() => validateOptions(validOptions)).not.toThrow();
    });

    it('when all options are valid and `branchChoices` is given', () => {
      expect(() =>
        validateOptions({
          ...validOptions,
          branchChoices: [{ name: 'branchA' }],
          branches: []
        })
      ).not.toThrow();
    });
  });

  describe('should throw', () => {
    it('when accessToken is missing', () => {
      expect(() =>
        validateOptions({
          ...validOptions,
          accessToken: undefined
        })
      ).toThrowErrorMatchingSnapshot();
    });

    it('when accessToken is empty', () => {
      expect(() =>
        validateOptions({
          ...validOptions,
          accessToken: ''
        })
      ).toThrowErrorMatchingSnapshot();
    });

    it('when both branches and branchChoices are missing', () => {
      expect(() =>
        validateOptions({
          ...validOptions,
          branchChoices: [],
          branches: []
        })
      ).toThrowErrorMatchingSnapshot();
    });

    it('when upstream is missing', () => {
      expect(() =>
        validateOptions({
          ...validOptions,
          upstream: undefined
        })
      ).toThrowErrorMatchingSnapshot();
    });

    it('when upstream is empty', () => {
      expect(() =>
        validateOptions({
          ...validOptions,
          upstream: ''
        })
      ).toThrowErrorMatchingSnapshot();
    });

    it('when username is missing', () => {
      expect(() =>
        validateOptions({
          ...validOptions,
          username: undefined
        })
      ).toThrowErrorMatchingSnapshot();
    });

    it('when username is empty', () => {
      expect(() =>
        validateOptions({
          ...validOptions,
          username: ''
        })
      ).toThrowErrorMatchingSnapshot();
    });
  });
});
