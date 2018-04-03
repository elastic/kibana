import { createUiSettingsApi } from './ui_settings_api';
import { sendRequest } from './send_request';

jest.mock('./send_request', () => {
  let resolve;
  const sendRequest = jest.fn(() => new Promise((res) => {
    resolve = res;
  }));

  return {
    sendRequest,

    resolveMockedSendRequest(value = {}) {
      resolve(value);
    },

    async resolveMockedSendRequestAndWaitForNext(value = {}) {
      const currentCallCount = sendRequest.mock.calls.length;
      resolve(value);

      const waitStart = Date.now();
      while (sendRequest.mock.calls.length === currentCallCount) {
        await new Promise(resolve => {
          setImmediate(resolve);
        });

        if (Date.now() - waitStart > 10000) {
          throw new Error('Waiting for subsequent call to sendRequest() timed out after 10 seconds');
        }
      }
    },
  };
});

beforeEach(() => {
  sendRequest.mockRestore();
  jest.clearAllMocks();
});

describe('#batchSet', () => {
  it('sends a single change immediately', () => {
    const uiSettingsApi = createUiSettingsApi();
    const { sendRequest } = require('./send_request');

    uiSettingsApi.batchSet('foo', 'bar');

    expect(sendRequest).toHaveBeenCalledTimes(1);
    expect(sendRequest.mock.calls).toMatchSnapshot('unbuffered foo=bar');
  });

  it('buffers changes while first request is in progress, sends buffered changes after first request completes', async () => {
    const uiSettingsApi = createUiSettingsApi();
    const { sendRequest, resolveMockedSendRequestAndWaitForNext } = require('./send_request');

    uiSettingsApi.batchSet('foo', 'bar');
    expect(sendRequest).toHaveBeenCalledTimes(1);
    expect(sendRequest.mock.calls).toMatchSnapshot('unbuffered foo=bar');
    sendRequest.mock.calls.length = 0;

    uiSettingsApi.batchSet('foo', 'baz');
    uiSettingsApi.batchSet('bar', 'bug');
    expect(sendRequest).not.toHaveBeenCalled();

    await resolveMockedSendRequestAndWaitForNext();

    expect(sendRequest).toHaveBeenCalledTimes(1);
    expect(sendRequest.mock.calls).toMatchSnapshot('buffered foo=baz bar=bug');
  });

  it('Overwrites previously buffered values with new values for the same key', async () => {
    const uiSettingsApi = createUiSettingsApi();
    const { sendRequest, resolveMockedSendRequestAndWaitForNext } = require('./send_request');

    uiSettingsApi.batchSet('foo', 'bar');
    expect(sendRequest).toHaveBeenCalledTimes(1);
    expect(sendRequest.mock.calls).toMatchSnapshot('unbuffered foo=bar');
    sendRequest.mock.calls.length = 0;

    // if changes were sent to the API now they would be { bar: 'foo' }
    uiSettingsApi.batchSet('bar', 'foo');
    // these changes override the preivous one, we should now send { bar: null }
    uiSettingsApi.batchSet('bar', null);

    await resolveMockedSendRequestAndWaitForNext();

    expect(sendRequest).toHaveBeenCalledTimes(1);
    expect(sendRequest.mock.calls).toMatchSnapshot('buffered bar=null');
  });

  it('Buffers are always clear of previously buffered changes', async () => {
    const uiSettingsApi = createUiSettingsApi();
    const { sendRequest, resolveMockedSendRequestAndWaitForNext } = require('./send_request');

    uiSettingsApi.batchSet('foo', 'bar');
    expect(sendRequest).toHaveBeenCalledTimes(1);
    expect(sendRequest.mock.calls).toMatchSnapshot('unbuffered foo=bar');
    sendRequest.mock.calls.length = 0;

    // buffer a change
    uiSettingsApi.batchSet('bar', 'foo');

    // flush the buffer and wait for next request to start
    await resolveMockedSendRequestAndWaitForNext();

    // buffer another change
    uiSettingsApi.batchSet('baz', 'box');

    // flush the buffer and wait for next request to start
    await resolveMockedSendRequestAndWaitForNext();

    expect(sendRequest).toHaveBeenCalledTimes(2);
    expect(sendRequest.mock.calls[0]).toMatchSnapshot('buffered bar=foo');
    expect(sendRequest.mock.calls[1]).toMatchSnapshot('buffered baz=box');
  });
});
