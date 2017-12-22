import { formatMsg } from './format_msg';
import expect from 'expect.js';

describe('formatMsg', () => {
  test('should prepend the second argument to result', () => {
    const actual = formatMsg('error message', 'unit_test');

    expect(actual).to.equal('unit_test: error message');
  });

  test('should handle a simple string', () => {
    const actual = formatMsg('error message');

    expect(actual).to.equal('error message');
  });

  test('should handle a simple Error object', () => {
    const err = new Error('error message');
    const actual = formatMsg(err);

    expect(actual).to.equal('error message');
  });

  test('should handle a simple Angular $http error object', () => {
    const err = {
      data: {
        statusCode: 403,
        error: 'Forbidden',
        message: '[security_exception] action [indices:data/read/msearch] is unauthorized for user [user]'
      },
      status: 403,
      config: {},
      statusText: 'Forbidden'
    };
    const actual = formatMsg(err);

    expect(actual).to.equal('Error 403 Forbidden: [security_exception] action [indices:data/read/msearch] is unauthorized for user [user]');
  });

  test('should handle an extended elasticsearch error', () => {
    const err = {
      resp: {
        error: {
          root_cause: [
            {
              reason: 'I am the detailed message'
            }
          ]
        }
      }
    };

    const actual = formatMsg(err);

    expect(actual).to.equal('I am the detailed message');
  });
});
