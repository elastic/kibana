import {
  getFirstCommitMessageLine,
  getHumanReadableReference,
  withFormattedCommitMessage
} from '../../../../src/services/github/commitFormatters';

describe('getHumanReadableReference', () => {
  it('should return a sha ref', () => {
    expect(
      getHumanReadableReference({ sha: 'mySha1234567', message: 'myMessage' })
    ).toEqual('mySha123');
  });

  it('should return a pr ref', () => {
    expect(
      getHumanReadableReference({
        pullNumber: 1337,
        sha: 'mySha1234567',
        message: 'myMessage'
      })
    ).toEqual('#1337');
  });
});

describe('getFirstCommitMessageLine', () => {
  it('should only return the first line of the message and omit the PR ref', () => {
    expect(
      getFirstCommitMessageLine(
        'My commit message (#1234)\n\n Additional commit message body'
      )
    ).toEqual('My commit message');
  });

  it('should return the commit message as-is', () => {
    expect(getFirstCommitMessageLine('My commit message')).toEqual(
      'My commit message'
    );
  });
});

describe('withFormattedCommitMessage', () => {
  it('should return a message with a sha ref', () => {
    expect(
      withFormattedCommitMessage({ sha: 'mySha1234567', message: 'myMessage' })
        .message
    ).toEqual('myMessage (mySha123)');
  });

  it('should return a message with a PR ref', () => {
    expect(
      withFormattedCommitMessage({
        sha: 'mySha1234567',
        message: 'myMessage (#12)',
        pullNumber: 1234
      }).message
    ).toEqual('myMessage (#1234)');
  });
});
