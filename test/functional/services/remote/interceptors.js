import { modifyUrl } from '../../../../src/utils';

export const createRemoteInterceptors = remote => ({
  // inject _t=Date query param on navigation
  async get(url) {
    const urlWithTime = modifyUrl(url, parsed => {
      parsed.query._t = Date.now();
    });

    return await remote.get(urlWithTime);
  },

  // strip _t=Date query param when url is read
  async getCurrentUrl() {
    const current = await remote.getCurrentUrl();
    const currentWithoutTime = modifyUrl(current, parsed => {
      delete parsed.query._t;
    });
    return currentWithoutTime;
  }
});
