import { formatMsg } from 'ui/notify/lib/_format_msg';
import expect from 'expect.js';
describe('formatMsg', function () {

  it('should prepend the second argument to result', function () {
    const actual = formatMsg('error message', 'unit_test');

    expect(actual).to.equal('unit_test: error message');
  });

  it('should handle a simple string', function () {
    const actual = formatMsg('error message');

    expect(actual).to.equal('error message');
  });

  it('should handle a simple Error object', function () {
    const err = new Error('error message');
    const actual = formatMsg(err);

    expect(actual).to.equal('error message');
  });

  it('should handle a simple Angular $http error object', function () {
    const err = {
      data: {
        statusCode: 403,
        error: 'Forbidden',
        message: '[security_exception] action [indices:data/read/mget] is unauthorized for user [user]'
      },
      status: 403,
      config: {},
      statusText: 'Forbidden'
    };
    const actual = formatMsg(err);

    expect(actual).to.equal('Error 403 Forbidden: [security_exception] action [indices:data/read/mget] is unauthorized for user [user]');
  });

  it('should handle an extended elasticsearch error', function () {
    const err = {
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

    const actual = formatMsg(err);

    expect(actual).to.equal('I am the detailed message');
  });

});
