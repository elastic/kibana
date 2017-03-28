import { resolve as resolveUrl } from 'url';

import { fromNode } from 'bluebird';
import Wreck from 'wreck';

const get = async (url) => fromNode(cb => {
  Wreck.get(url, { json: 'force' }, (err, resp, payload) => {
    cb(err, payload); // resp is an Http#IncomingMessage, payload is the parsed version
  });
});

export class KibanaServerStatus {
  constructor(kibanaServerUrl) {
    this.kibanaServerUrl = kibanaServerUrl;
  }

  async get() {
    return await get(resolveUrl(this.kibanaServerUrl, './api/status'));
  }

  async getOverallState() {
    const status = await this.get();
    return status.status.overall.state;
  }
}
