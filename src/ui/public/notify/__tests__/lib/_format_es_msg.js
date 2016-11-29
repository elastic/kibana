import formatESMsg from 'ui/notify/lib/_format_es_msg';
import expect from 'expect.js';
describe('formatESMsg', function () {

  it('should return undefined if passed a basic error', function () {
    let err = new Error('This is a normal error');

    let actual = formatESMsg(err);

    expect(actual).to.be(undefined);
  });

  it('should return undefined if passed a string', function () {
    let err = 'This is a error string';

    let actual = formatESMsg(err);

    expect(actual).to.be(undefined);
  });

  it('should return the root_cause if passed an extended elasticsearch', function () {
    let err = new Error('This is an elasticsearch error');
    err.resp = {
      error : {
        root_cause : [
          {
            reason : 'I am the detailed message'
          }
        ]
      }
    };

    let actual = formatESMsg(err);

    expect(actual).to.equal('I am the detailed message');
  });

  it('should combine the reason messages if more than one is returned.', function () {
    let err = new Error('This is an elasticsearch error');
    err.resp = {
      error : {
        root_cause : [
          {
            reason : 'I am the detailed message 1'
          },
          {
            reason : 'I am the detailed message 2'
          }
        ]
      }
    };

    let actual = formatESMsg(err);

    expect(actual).to.equal('I am the detailed message 1\nI am the detailed message 2');
  });
});
