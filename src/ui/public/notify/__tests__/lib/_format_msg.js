import formatMsg from 'ui/notify/lib/_format_msg';
import expect from 'expect.js';
describe('formatMsg', function () {

  it('should prepend the second argument to result', function () {
    let actual = formatMsg('error message', 'unit_test');

    expect(actual).to.equal('unit_test: error message');
  });

  it('should handle a simple string', function () {
    let actual = formatMsg('error message');

    expect(actual).to.equal('error message');
  });

  it('should handle a simple Error object', function () {
    let err = new Error('error message');
    let actual = formatMsg(err);

    expect(actual).to.equal('error message');
  });

  it('should handle a simple Angular $http error object', function () {
    let err = {
      data: {
        statusCode: 403,
        error: 'Forbidden',
        message: '[security_exception] action [indices:data/read/mget] is unauthorized for user [user]'
      },
      status: 403,
      config: {},
      statusText: 'Forbidden'
    };
    let actual = formatMsg(err);

    expect(actual).to.equal('Error 403 Forbidden: [security_exception] action [indices:data/read/mget] is unauthorized for user [user]');
  });

  it('should handle an extended elasticsearch error', function () {
    let err = {
      resp : {
        error : {
          root_cause : [
            {
              reason : 'I am the detailed message'
            }
          ]
        }
      }
    };

    let actual = formatMsg(err);

    expect(actual).to.equal('I am the detailed message');
  });

});
