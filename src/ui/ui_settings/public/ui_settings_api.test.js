import { createUiSettingsApi } from './ui_settings_api';
import { sendRequest } from './send_request';

jest.useFakeTimers();
jest.mock('./send_request', () => ({
  sendRequest: jest.fn(() => ({}))
}));

beforeEach(() => {
  sendRequest.mockRestore();
  jest.clearAllMocks();
});

describe('#batchSet', () => {
  it('batches changes for 200ms, sends all at once', () => {
    const uiSettingsApi = createUiSettingsApi();
    const { sendRequest } = require('./send_request');

    uiSettingsApi.batchSet('foo', 'bar');

    expect(setTimeout).toHaveBeenCalledTimes(1);
    expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 200);
    expect(sendRequest).not.toHaveBeenCalled();

    jest.runAllTimers();

    expect(setTimeout).toHaveBeenCalledTimes(1);
    expect(sendRequest).toHaveBeenCalledTimes(1);
    expect(sendRequest.mock.calls).toMatchSnapshot();
  });

  it('cancels 200ms timer on subsequent requests, always waiting 200ms from most recent call', () => {
    const uiSettingsApi = createUiSettingsApi();

    uiSettingsApi.batchSet('foo', 'bar');
    expect(setTimeout).toHaveBeenCalledTimes(1);
    expect(clearTimeout).toHaveBeenCalledTimes(0);

    uiSettingsApi.batchSet('foo', 'baz');
    expect(setTimeout).toHaveBeenCalledTimes(2);
    expect(clearTimeout).toHaveBeenCalledTimes(1);
  });

  it('resolves promises with resolve value of Api.request()', async () => {
    const uiSettingsApi = createUiSettingsApi();
    const { sendRequest } = require('./send_request');

    sendRequest.mockImplementation(() => 'foobar');

    const promises = [
      uiSettingsApi.batchSet('foo', 'bar'),
      uiSettingsApi.batchSet('foo', 'baz'),
      uiSettingsApi.batchSet('foo', 'bam'),
      uiSettingsApi.batchSet('foo', 'bom'),
    ];

    jest.runAllTimers();

    await expect(Promise.all(promises)).resolves.toMatchSnapshot();
  });
});
